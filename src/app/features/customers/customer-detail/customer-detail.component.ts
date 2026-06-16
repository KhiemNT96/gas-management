import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';
import * as L from 'leaflet';
import { Customer } from '../../../models/customer.model';
import { Order } from '../../../models/order.model';
import { CustomerService } from '../../../core/services/customer.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';

// Fix Leaflet default marker icon paths
delete (L.Icon.Default.prototype as any)['_getIconUrl'];
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe, RouterLink,
    MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.css']})
export class CustomerDetailComponent implements OnInit {
  customer!: Customer;
  orders$!: Observable<Order[]>;
  showPhoto = false;
  private miniMaps: L.Map[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private orderService: OrderService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const c = this.customerService.getById(id);
      if (c) {
        this.customer = c;
        this.orders$ = this.orderService.getByCustomerId(id);
        setTimeout(() => this.initMiniMap(), 500);
      }
    }
  }

  ngOnDestroy(): void {
    this.miniMaps.forEach(m => m.remove());
  }

  goBack(): void {
    this.router.navigate(['/customers']);
  }

  deleteCustomer(): void {
    if (confirm('Xóa khách hàng này?')) {
      this.customerService.delete(this.customer.id);
      this.toast.success('Đã xóa khách hàng');
      this.router.navigate(['/customers']);
    }
  }

  openPhoto(): void {
    this.showPhoto = true;
  }

  private initMiniMap(): void {
    const mapId = 'mini-map-' + this.customer.id;
    const mapEl = document.getElementById(mapId);
    if (!mapEl) {
      setTimeout(() => this.initMiniMap(), 200);
      return;
    }

    const map = L.map(mapId, {
      center: [this.customer.latitude, this.customer.longitude],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
      maxZoom: 19
    }).addTo(map);

    // Custom small marker
    L.marker([this.customer.latitude, this.customer.longitude]).addTo(map);

    this.miniMaps.push(map);
  }
}