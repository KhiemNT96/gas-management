import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Customer } from '../../../models/customer.model';
import { CustomerService } from '../../../core/services/customer.service';
import { CustomerExcelService } from '../../../core/services/customer-excel.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe, RouterLink,
    MatCardModule, MatIconModule, MatButtonModule, FormsModule],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.css']})
export class CustomerListComponent implements OnInit {
  customers$!: Observable<Customer[]>;
  searchQuery = '';
  isImporting = false;

  constructor(
    private customerService: CustomerService,
    private excelService: CustomerExcelService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.customers$ = this.customerService.getAll();
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.customers$ = this.customerService.search(this.searchQuery);
    } else {
      this.customers$ = this.customerService.getAll();
    }
  }

  exportAll(): void {
    this.excelService.exportAllToExcel();
    this.toast.success('✅ Đã xuất dữ liệu ra Excel (3 tab: Khách hàng, Công nợ, Lịch sử mua hàng)');
  }

  async importExcel(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.name.endsWith('.json')) {
      this.toast.error('⚠️ Vui lòng chọn file JSON (.json)');
      input.value = '';
      return;
    }

    this.isImporting = true;
    try {
      const result = await this.excelService.importFromExcel(file);
      this.toast.success(`✅ Đã nhập ${result.imported} KH, bỏ qua ${result.skipped} KH (trùng SĐT)`);

      // Refresh list
      this.customers$ = this.customerService.getAll();
    } catch (err: any) {
      this.toast.error(err.message || '⚠️ Lỗi khi nhập file');
    }

    this.isImporting = false;
    input.value = '';
  }
}
