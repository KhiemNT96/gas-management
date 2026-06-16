import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';
import { Customer } from '../../../models/customer.model';
import { CustomerService } from '../../../core/services/customer.service';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../models/order.model';

@Component({
  selector: 'app-delivery-search',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe, RouterLink,
    FormsModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './delivery-search.component.html',
  styleUrls: ['./delivery-search.component.css']})
export class DeliverySearchComponent implements OnInit {
  searchQuery = '';
  searchResults$!: Observable<Customer[]>;

  constructor(
    private customerService: CustomerService,
    private orderService: OrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.searchResults$ = this.customerService.getAll();
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.searchResults$ = this.customerService.search(this.searchQuery);
    } else {
      this.searchResults$ = this.customerService.getAll();
    }
  }

  selectCustomer(customer: Customer): void {
    this.router.navigate(['/delivery/route', customer.id]);
  }
}