import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, AsyncPipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { CustomerService } from '../../../core/services/customer.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { Customer } from '../../../models/customer.model';
import { Order, GAS_TYPE_LABELS, GAS_PRICES } from '../../../models/order.model';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, CurrencyPipe, FormsModule, RouterLink, MatCardModule, MatButtonModule, MatInputModule, MatSelectModule],
  templateUrl: './order-form.component.html',
  styleUrls: ['./order-form.component.css']})
export class OrderFormComponent implements OnInit {
  customers$!: Observable<Customer[]>;
  selectedCustomerId = '';
  selectedGasType = '';
  quantity = 1;
  gasTypes = ['12kg', '45kg', '50kg'] as const;
  GAS_TYPE_LABELS = GAS_TYPE_LABELS;
  GAS_PRICES = GAS_PRICES;

  get totalAmount(): number {
    return (GAS_PRICES[this.selectedGasType as keyof typeof GAS_PRICES] || 0) * this.quantity;
  }

  constructor(
    private customerService: CustomerService,
    private orderService: OrderService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.customers$ = this.customerService.getAll();
  }

  createOrder(): void {
    const customer = this.customerService.getById(this.selectedCustomerId);
    if (!customer) return;

    const now = new Date().toISOString();
    const order: Order = {
      id: this.orderService.generateId(),
      customerId: customer.id,
      customerName: customer.name,
      orderDate: now,
      gasType: this.selectedGasType as any,
      quantity: this.quantity,
      unitPrice: this.totalAmount / this.quantity,
      totalAmount: this.totalAmount,
      paidAmount: 0,
      debtAmount: this.totalAmount,
      paymentStatus: 'unpaid',
      deliveryStatus: 'pending',
      deliveryEvidence: null,
      note: '',
      createdAt: now,
      updatedAt: now
    };

    this.orderService.add(order);
    this.toast.success('Tạo đơn hàng thành công');
    this.router.navigate(['/orders']);
  }
}