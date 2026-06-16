import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CustomerService } from '../../core/services/customer.service';
import { OrderService } from '../../core/services/order.service';
import { GasPriceService, GasPriceGroup } from '../../core/services/gas-price.service';
import { ToastService } from '../../core/services/toast.service';
import { Customer } from '../../models/customer.model';
import { Order } from '../../models/order.model';
import { DashboardStats } from '../../models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe, FormsModule, MatCardModule, MatIconModule, MatButtonModule, MatInputModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']})
export class DashboardComponent implements OnInit {
  stats$!: Observable<DashboardStats>;
  recentOrders$!: Observable<any[]>;
  priceGroups: GasPriceGroup[] = [];
  editPrices: { [key: string]: number } = {};
  priceMeta = this.gasPriceService.getMeta();
  isFetching = false;

  constructor(
    private customerService: CustomerService,
    private orderService: OrderService,
    private gasPriceService: GasPriceService,
    private toast: ToastService
  ) {
    this.loadPrices();
  }

  ngOnInit(): void {
    this.loadStats();
    this.recentOrders$ = this.orderService.getAll().pipe(
      map(orders => orders
        .sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
        .slice(0, 10)
      )
    );
  }

  private loadPrices(): void {
    this.priceGroups = this.gasPriceService.getGroups();
    this.priceMeta = this.gasPriceService.getMeta();
    this.editPrices = {};
  }

  async fetchMarketPrices(): Promise<void> {
    this.isFetching = true;
    const result = await this.gasPriceService.fetchFromMarket();
    this.isFetching = false;
    this.loadPrices();
    if (result.success) {
      this.toast.success(result.message);
    } else {
      this.toast.error(result.message);
    }
  }

  updatePrice(groupId: string, brand: string): void {
    const key = groupId + '_' + brand;
    const newPrice = this.editPrices[key];
    if (!newPrice || newPrice <= 0) return;
    this.gasPriceService.updatePrice(groupId, brand, newPrice);
    this.loadPrices();
    this.editPrices[key] = 0;
    this.toast.success(`✅ Đã cập nhật giá ${brand}`);
  }

  resetPrices(): void {
    if (confirm('Đặt lại bảng giá mặc định?')) {
      this.gasPriceService.resetToDefault();
      this.loadPrices();
      this.toast.success('✅ Đã đặt lại bảng giá mặc định');
    }
  }

  private loadStats(): void {
    this.stats$ = new Observable<DashboardStats>(observer => {
      const customers = this.customerService['storage'].getCollectionSnapshot<Customer>('customers');
      const orders = this.orderService['storage'].getCollectionSnapshot<Order>('orders');
      
      const totalOrders = orders.length;
      const totalBottlesSold = orders.reduce((sum: number, o: any) => sum + o.quantity, 0);
      const totalDebt = orders.reduce((sum: number, o: any) => sum + (o.debtAmount || 0), 0);
      const today = new Date().toISOString().split('T')[0];
      const deliveredToday = orders.filter((o: any) =>
        o.orderDate.startsWith(today) && o.deliveryStatus === 'delivered'
      ).length;

      observer.next({
        totalCustomers: customers.length,
        totalOrders,
        totalBottlesSold,
        totalDebt,
        debtCustomerCount: customers.filter((c: any) => c.currentDebt > 0).length,
        deliveredToday
      });
      observer.complete();
    });
  }
}