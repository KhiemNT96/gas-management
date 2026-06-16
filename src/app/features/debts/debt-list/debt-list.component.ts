import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';
import { Customer } from '../../../models/customer.model';
import { CustomerService } from '../../../core/services/customer.service';

@Component({
  selector: 'app-debt-list',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe, RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './debt-list.component.html',
  styleUrls: ['./debt-list.component.css']})
export class DebtListComponent implements OnInit {
  debtCustomers: Customer[] = [];
  totalDebt = 0;

  constructor(private customerService: CustomerService) {}

  ngOnInit(): void {
    this.customerService.getDebtCustomers().subscribe(customers => {
      this.debtCustomers = customers;
      this.totalDebt = customers.reduce((sum, c) => sum + (c.currentDebt || 0), 0);
    });
  }
}