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
  private routingControl: any = null;

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
    if (this.routingControl) {
      (this.map as any)?.removeControl(this.routingControl);
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

        // Update routing from current location to customer
        if (this.map && this.customer) {
          this.map.flyTo([lat, lng], 15);

          if (this.routingControl) {
            (this.map as any).removeControl(this.routingControl);
          }

          this.routingControl = (L as any).Routing.control({
            waypoints: [
              L.latLng(lat, lng),
              L.latLng(this.customer.latitude, this.customer.longitude)
            ],
            routeWhileDragging: false,
            showAlternatives: false,
            fitSelectedRoutes: true,
            lineOptions: {
              styles: [{ color: '#1a237e', weight: 4, opacity: 0.8 }]
            },
            createMarker: () => null
          }).addTo(this.map!);

          this.routingControl.on('routesfound', (e: any) => {
            const routes = e.routes;
            if (routes.length > 0) {
              const summary = routes[0].summary;
              this.routeDistance = summary.totalDistance > 1000
                ? (summary.totalDistance / 1000).toFixed(1) + ' km'
                : Math.round(summary.totalDistance) + ' m';
              this.routeTime = Math.round(summary.totalTime / 60) + ' phút';
            }
          });
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

    // Add routing
    this.routingControl = L.Routing.control({
      waypoints: [
        L.latLng(storeLoc.lat, storeLoc.lng),
        L.latLng(c.latitude, c.longitude)
      ],
      routeWhileDragging: false,
      showAlternatives: false,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: '#1a237e', weight: 4, opacity: 0.8 }]
      },
      createMarker: () => null
    } as any).addTo(this.map!);

    this.routingControl.on('routesfound', (e: any) => {
      const routes = e.routes;
      if (routes.length > 0) {
        const summary = routes[0].summary;
        this.routeDistance = summary.totalDistance > 1000
          ? (summary.totalDistance / 1000).toFixed(1) + ' km'
          : Math.round(summary.totalDistance) + ' m';
        this.routeTime = Math.round(summary.totalTime / 60) + ' phút';
      }
    });
  }
}
