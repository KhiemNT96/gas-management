import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../core/services/toast.service';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { Customer } from '../../../models/customer.model';
import { CustomerService } from '../../../core/services/customer.service';
import { OrderService } from '../../../core/services/order.service';
import { StoreLocationService } from '../../../core/services/store-location.service';

// Fix Leaflet default marker icon paths for webpack
delete (L.Icon.Default.prototype as any)['_getIconUrl'];
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const OSRM_URL = 'https://router.project-osrm.org/route/v1';

@Component({
  selector: 'app-delivery-route',
  standalone: true,
  imports: [NgIf, CurrencyPipe, DatePipe, RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './delivery-route.component.html',
  styleUrls: ['./delivery-route.component.css']})
export class DeliveryRouteComponent implements OnInit, OnDestroy {
  customer: Customer | null = null;
  routeDistance = '';
  routeTime = '';
  showPhoto = false;
  isGettingLocation = false;
  private myLocationMarker: L.Marker | null = null;
  private map: L.Map | null = null;
  private routeLine: L.Polyline | null = null;

  constructor(
    private route: ActivatedRoute,
    private customerService: CustomerService,
    private orderService: OrderService,
    private storeLocationService: StoreLocationService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('customerId');
    if (id) {
      this.customer = this.customerService.getById(id);
      if (this.customer) {
        setTimeout(() => this.initMap(), 100);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.routeLine) {
      this.map?.removeLayer(this.routeLine);
    }
    this.map?.remove();
  }

  callCustomer(phone: string): void {
    window.open('tel:' + phone, '_self');
  }

  getMyLocation(): void {
    if (!navigator.geolocation) {
      this.toast.error('Trình duyệt không hỗ trợ GPS');
      return;
    }
    this.isGettingLocation = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.isGettingLocation = false;

        // Add or update current location marker
        const myIcon = L.divIcon({
          html: '<div style="background:#4caf50;color:white;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:bold;white-space:nowrap">📍 Tôi</div>',
          className: 'custom-marker',
          iconSize: [60, 24],
          iconAnchor: [30, 12]
        });

        if (this.myLocationMarker) {
          this.myLocationMarker.setLatLng([lat, lng]);
        } else if (this.map) {
          this.myLocationMarker = L.marker([lat, lng], { icon: myIcon }).addTo(this.map!);
        }

        // Get route from current location to customer
        if (this.customer) {
          if (this.map) {
            this.map.flyTo([lat, lng], 15);
          }
          this.fetchRoute(lat, lng, this.customer.latitude, this.customer.longitude);
        }
      },
      (error) => {
        this.isGettingLocation = false;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.toast.error('Chưa cấp quyền vị trí');
            break;
          case error.POSITION_UNAVAILABLE:
            this.toast.error('Không lấy được vị trí, hãy ra ngoài trời');
            break;
          case error.TIMEOUT:
            this.toast.error('Quá thời gian lấy vị trí');
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  private async fetchRoute(lat1: number, lng1: number, lat2: number, lng2: number): Promise<void> {
    try {
      const url = `${OSRM_URL}/driving/${lng1},${lat1};${lng2},${lat2}?geometries=geojson&overview=full&alternatives=false&steps=false`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        this.toast.error('Không tìm thấy đường đi');
        return;
      }

      const route = data.routes[0];
      const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);

      // Remove old route line
      if (this.routeLine) {
        this.map?.removeLayer(this.routeLine);
      }

      // Draw new route
      this.routeLine = L.polyline(coords, {
        color: '#1a237e',
        weight: 4,
        opacity: 0.8
      }).addTo(this.map!);

      // Fit map to show the route
      this.map?.fitBounds(this.routeLine.getBounds(), { padding: [50, 50] });

      // Update stats
      const summary = route.legs?.[0] || route;
      const distance = summary.distance || 0;
      const duration = summary.duration || 0;
      this.routeDistance = distance > 1000
        ? (distance / 1000).toFixed(1) + ' km'
        : Math.round(distance) + ' m';
      this.routeTime = Math.round(duration / 60) + ' phút';
    } catch (err) {
      console.error('OSRM error:', err);
      this.toast.error('Lỗi tải đường đi, kiểm tra kết nối mạng');
    }
  }

  private initMap(): void {
    const c = this.customer;
    if (!c) return;

    const mapEl = document.getElementById('map');
    if (!mapEl) {
      setTimeout(() => this.initMap(), 200);
      return;
    }

    const storeLoc = this.storeLocationService.getLocation();

    this.map = L.map('map', {
      center: [storeLoc.lat, storeLoc.lng],
      zoom: 14,
      zoomControl: true
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
      maxZoom: 19
    }).addTo(this.map);

    // Add store marker
    const storeIcon = L.divIcon({
      html: '<div style="background:#1a237e;color:white;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:bold;white-space:nowrap">🏪 Cửa hàng</div>',
      className: 'custom-marker',
      iconSize: [80, 24],
      iconAnchor: [40, 12]
    });
    L.marker([storeLoc.lat, storeLoc.lng], { icon: storeIcon }).addTo(this.map!);

    // Add customer marker
    const customerIcon = L.divIcon({
      html: `<div style="background:#f44336;color:white;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:bold;white-space:nowrap">📍 ${c.name}</div>`,
      className: 'custom-marker',
      iconSize: [120, 24],
      iconAnchor: [60, 12]
    });
    L.marker([c.latitude, c.longitude], { icon: customerIcon }).addTo(this.map!);

    // Fetch initial route from store to customer
    this.fetchRoute(storeLoc.lat, storeLoc.lng, c.latitude, c.longitude);
  }
}