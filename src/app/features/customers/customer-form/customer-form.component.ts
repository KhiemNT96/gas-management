import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { CustomerService } from '../../../core/services/customer.service';
import { ToastService } from '../../../core/services/toast.service';
import { StoreLocationService } from '../../../core/services/store-location.service';
import { Customer } from '../../../models/customer.model';

// Fix Leaflet default marker icon paths
delete (L.Icon.Default.prototype as any)['_getIconUrl'];
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, RouterLink, MatCardModule, MatButtonModule, MatInputModule, MatSelectModule],
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.css']})
export class CustomerFormComponent implements OnInit, OnDestroy {
  customer: Customer = this.getEmptyCustomer();
  isEdit = false;
  customerId: string | null = null;
  initialGasDebt = 0;
  initialStoveDebt = 0;
  searchText = '';
  searchResults: SearchResult[] = [];
  isGettingLocation = false;
  private searchTimeout: any;
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  constructor(
    private customerService: CustomerService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private storeLocationService: StoreLocationService
  ) {}

  ngOnInit(): void {
    this.customerId = this.route.snapshot.paramMap.get('id');
    if (this.customerId) {
      this.isEdit = true;
      const existing = this.customerService.getById(this.customerId);
      if (existing) {
        this.customer = { ...existing };
      }
    }
    // Wait for DOM to render, then init map
    setTimeout(() => this.initMap(), 200);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.customer.photoUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.customer.photoUrl = null;
  }

  save(): void {
    if (!this.customer.name.trim()) return;

    const now = new Date().toISOString();
    if (this.isEdit && this.customerId) {
      this.customerService.update(this.customerId, this.customer);
      this.toast.success('Cập nhật thông tin thành công');
    } else {
      this.customer.id = this.customerService.generateId();
      this.customer.createdAt = now;
      this.customer.updatedAt = now;
      if (this.initialGasDebt > 0 || this.initialStoveDebt > 0) {
        this.customer.gasDebt = this.initialGasDebt;
        this.customer.stoveDebt = this.initialStoveDebt;
        this.customer.currentDebt = this.initialGasDebt + this.initialStoveDebt;
      }
      this.customerService.add(this.customer);
      this.toast.success('Thêm khách hàng thành công');
    }
    this.router.navigate(['/customers']);
  }

  onSearchInput(): void {
    clearTimeout(this.searchTimeout);
    const q = this.searchText.trim();
    if (q.length < 3) {
      this.searchResults = [];
      return;
    }
    this.searchTimeout = setTimeout(() => this.searchLocation(q), 500);
  }

  clearSearch(): void {
    this.searchText = '';
    this.searchResults = [];
  }

  selectLocation(result: SearchResult): void {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    this.customer.latitude = lat;
    this.customer.longitude = lon;
    this.searchText = result.display_name.split(',')[0];
    this.searchResults = [];

    // Fly map to selected location
    if (this.map) {
      this.map.flyTo([lat, lon], 18);
      if (this.marker) {
        this.marker.setLatLng([lat, lon]);
      } else {
        this.marker = L.marker([lat, lon], { draggable: true }).addTo(this.map!);
        this.marker.on('dragend', () => {
          const pos = this.marker!.getLatLng();
          this.customer.latitude = parseFloat(pos.lat.toFixed(6));
          this.customer.longitude = parseFloat(pos.lng.toFixed(6));
        });
      }
    }
  }

  getCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.toast.error('Trình duyệt không hỗ trợ GPS');
      return;
    }
    this.isGettingLocation = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        this.customer.latitude = parseFloat(lat.toFixed(6));
        this.customer.longitude = parseFloat(lon.toFixed(6));
        this.isGettingLocation = false;
        this.toast.success('Đã lấy vị trí hiện tại!');

        if (this.map) {
          this.map.flyTo([lat, lon], 19);
          if (this.marker) {
            this.marker.setLatLng([lat, lon]);
          } else {
            this.marker = L.marker([lat, lon], { draggable: true }).addTo(this.map!);
            this.marker.on('dragend', () => {
              const pos = this.marker!.getLatLng();
              this.customer.latitude = parseFloat(pos.lat.toFixed(6));
              this.customer.longitude = parseFloat(pos.lng.toFixed(6));
            });
          }
        }
      },
      (error) => {
        this.isGettingLocation = false;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.toast.error('Bạn chưa cấp quyền truy cập vị trí');
            break;
          case error.POSITION_UNAVAILABLE:
            this.toast.error('Không thể lấy vị trí, hãy ra ngoài trời');
            break;
          case error.TIMEOUT:
            this.toast.error('Quá thời gian lấy vị trí');
            break;
          default:
            this.toast.error('Lỗi GPS: ' + error.message);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  private searchLocation(query: string): void {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=VN`;
    this.http.get<SearchResult[]>(url).subscribe({
      next: (results) => {
        this.searchResults = results;
      },
      error: () => {
        this.searchResults = [];
      }
    });
  }

  private getEmptyCustomer(): Customer {
    const storeLoc = this.storeLocationService.getLocation();
    return {
      id: '', name: '', phone: '', address: '', area: '',
      note: '', latitude: storeLoc.lat, longitude: storeLoc.lng,
      currentDebt: 0, gasDebt: 0, stoveDebt: 0,
      lastPurchaseDate: null, photoUrl: null,
      createdAt: '', updatedAt: ''
    };
  }

  private initMap(): void {
    const mapEl = document.getElementById('location-map');
    if (!mapEl) {
      setTimeout(() => this.initMap(), 200);
      return;
    }

    const storeLoc = this.storeLocationService.getLocation();
    const lat = this.customer.latitude || storeLoc.lat;
    const lng = this.customer.longitude || storeLoc.lng;

    this.map = L.map('location-map', {
      center: [lat, lng],
      zoom: 16,
      zoomControl: true
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
      maxZoom: 19
    }).addTo(this.map);

    // Add marker at current position
    if (this.customer.latitude && this.customer.longitude) {
      this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map!);
      this.marker.on('dragend', () => {
        const pos = this.marker!.getLatLng();
        this.customer.latitude = parseFloat(pos.lat.toFixed(6));
        this.customer.longitude = parseFloat(pos.lng.toFixed(6));
      });
    }

    // Click on map to place/update marker
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const pos = e.latlng;
      if (this.marker) {
        this.marker.setLatLng(pos);
      } else {
        this.marker = L.marker(pos, { draggable: true }).addTo(this.map!);
        this.marker.on('dragend', () => {
          const p = this.marker!.getLatLng();
          this.customer.latitude = parseFloat(p.lat.toFixed(6));
          this.customer.longitude = parseFloat(p.lng.toFixed(6));
        });
      }
      this.customer.latitude = parseFloat(pos.lat.toFixed(6));
      this.customer.longitude = parseFloat(pos.lng.toFixed(6));
    });
  }
}