import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { StoreLocationService, StoreLocation } from '../../core/services/store-location.service';
import { ToastService } from '../../core/services/toast.service';
import { StorageService } from '../../core/services/storage.service';

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
  selector: 'app-settings',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, RouterLink, MatCardModule, MatButtonModule, MatInputModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']})
export class SettingsComponent implements OnInit, OnDestroy {
  location: StoreLocation;
  isGettingLocation = false;
  markerLat: number | null = null;
  markerLng: number | null = null;
  searchText = '';
  searchResults: SearchResult[] = [];
  isImporting = false;
  isExporting = false;

  private searchTimeout: any;
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  constructor(
    private storeLocationService: StoreLocationService,
    private toast: ToastService,
    private http: HttpClient,
    private storage: StorageService
  ) {
    this.location = this.storeLocationService.getLocation();
    this.markerLat = this.location.lat;
    this.markerLng = this.location.lng;
  }

  ngOnInit(): void {
    setTimeout(() => this.initMap(), 200);
  }

  ngOnDestroy(): void {
    this.map?.remove();
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
        const lng = position.coords.longitude;
        this.markerLat = parseFloat(lat.toFixed(6));
        this.markerLng = parseFloat(lng.toFixed(6));
        this.isGettingLocation = false;
        this.toast.success('Đã lấy vị trí! Kéo thả marker để tinh chỉnh.');

        if (this.map) {
          this.map.flyTo([lat, lng], 18);
          if (this.marker) {
            this.marker.setLatLng([lat, lng]);
          }
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
    this.markerLat = lat;
    this.markerLng = lon;
    this.searchText = result.display_name.split(',')[0];
    this.searchResults = [];

    if (this.map) {
      this.map.flyTo([lat, lon], 18);
      if (this.marker) {
        this.marker.setLatLng([lat, lon]);
      }
    }
  }

  saveLocation(): void {
    if (!this.markerLat || !this.markerLng) {
      this.toast.error('Vui lòng chọn vị trí trên bản đồ');
      return;
    }
    this.storeLocationService.saveLocation({
      lat: this.markerLat,
      lng: this.markerLng,
      address: this.location.address
    });
    this.toast.success('Đã lưu vị trí cửa hàng thành công ✅');
  }

  // ============================================================
  // JSON Import / Export
  // ============================================================

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.name.endsWith('.json')) {
      this.toast.error('Vui lòng chọn file JSON (.json)');
      return;
    }

    this.isImporting = true;
    this.storage.importFromJson(file).then((data) => {
      const counts = [];
      if (data.customers.length > 0) counts.push(`${data.customers.length} khách hàng`);
      if (data.orders.length > 0) counts.push(`${data.orders.length} đơn hàng`);
      if (data.payments.length > 0) counts.push(`${data.payments.length} thanh toán`);
      this.toast.success(`✅ Đã import: ${counts.join(', ')}`);
    }).catch((err: Error) => {
      this.toast.error(err.message || 'Lỗi import file JSON');
    }).finally(() => {
      this.isImporting = false;
      input.value = '';
    });
  }

  exportToJson(): void {
    this.isExporting = true;
    try {
      this.storage.exportToJson();
      this.toast.success('✅ Đã export dữ liệu ra file JSON');
    } catch (err) {
      this.toast.error('Lỗi export dữ liệu');
    } finally {
      this.isExporting = false;
    }
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

  private initMap(): void {
    const mapEl = document.getElementById('settings-map');
    if (!mapEl) {
      setTimeout(() => this.initMap(), 200);
      return;
    }

    const lat = this.location.lat;
    const lng = this.location.lng;

    this.map = L.map('settings-map', {
      center: [lat, lng],
      zoom: 17,
      zoomControl: true
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
      maxZoom: 19
    }).addTo(this.map);

    // Add marker at store position
    this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map!);
    this.marker.on('dragend', () => {
      const pos = this.marker!.getLatLng();
      this.markerLat = parseFloat(pos.lat.toFixed(6));
      this.markerLng = parseFloat(pos.lng.toFixed(6));
    });

    // Click on map to move marker
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const pos = e.latlng;
      this.marker!.setLatLng(pos);
      this.markerLat = parseFloat(pos.lat.toFixed(6));
      this.markerLng = parseFloat(pos.lng.toFixed(6));
    });
  }
}