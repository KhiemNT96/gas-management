import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Order } from '../../../models/order.model';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe, RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.css']})
export class OrderListComponent implements OnInit {
  orders$!: Observable<Order[]>;

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.orders$ = this.orderService.getAll().pipe(
      map(orders => orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()))
    );
  }
}