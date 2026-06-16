import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { InventoryService, InventoryItem, InventoryTransaction } from '../../core/services/inventory.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
imports: [NgFor, NgIf, DatePipe, CurrencyPipe, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatInputModule, MatSelectModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css']})
export class InventoryComponent implements OnInit {
  items: InventoryItem[] = [];
  transactions: InventoryTransaction[] = [];
  filteredTransactions: InventoryTransaction[] = [];
  txFilter = 'all';

  showAdd = false;
  showRemove = false;
  showEdit = false;

  dialogItemSize = '';
  dialogQty = 0;
  dialogPrice = 0;
  dialogNote = '';
  selectedItem: InventoryItem | null = null;
  editCurrentQty = 0;
  get currentItemQty(): number {
    const item = this.findItem(this.dialogItemSize);
    return item ? item.quantity : 0;
  }

  constructor(
    private inventoryService: InventoryService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.items = this.inventoryService.getItems();
    this.transactions = this.inventoryService.getTransactions();
    this.applyTxFilter();
  }

  private findItem(size: string): InventoryItem | undefined {
    return this.items.find(i => i.size === size);
  }

  openAddStock(item: InventoryItem): void {
    this.selectedItem = item;
    this.dialogItemSize = item.size;
    this.dialogQty = 0;
    this.dialogPrice = 0;
    this.dialogNote = '';
    this.showAdd = true;
  }

  openRemoveStock(item: InventoryItem): void {
    this.selectedItem = item;
    this.dialogItemSize = item.size;
    this.dialogQty = 0;
    this.dialogPrice = 0;
    this.showRemove = true;
  }

  openEditStock(item: InventoryItem): void {
    this.selectedItem = item;
    this.dialogItemSize = item.size;
    this.dialogQty = item.quantity;
    this.dialogPrice = 0;
    this.editCurrentQty = item.quantity;
    this.showEdit = true;
  }

  onEditTypeChange(): void {
    const found = this.findItem(this.dialogItemSize);
    if (found) {
      this.editCurrentQty = found.quantity;
      this.dialogQty = found.quantity;
      this.selectedItem = found;
    }
  }

  closeAll(): void {
    this.showAdd = false;
    this.showRemove = false;
    this.showEdit = false;
  }

  applyTxFilter(): void {
    if (this.txFilter === 'all') {
      this.filteredTransactions = this.transactions;
    } else {
      this.filteredTransactions = this.transactions.filter(tx => tx.type === this.txFilter);
    }
  }

  confirmAdd(): void {
    if (!this.dialogItemSize || !this.dialogQty || this.dialogQty <= 0) return;
    this.inventoryService.addStock(this.dialogItemSize, this.dialogQty, this.dialogPrice, this.dialogNote);
    this.loadData();
    this.closeAll();
    this.toast.success(`✅ Đã nhập kho ${this.dialogQty} bình`);
  }

  confirmRemove(): void {
    if (!this.dialogItemSize || !this.dialogQty || this.dialogQty <= 0) return;
    const success = this.inventoryService.removeStock(this.dialogItemSize, this.dialogQty, this.dialogPrice, this.dialogNote);
    if (success) {
      this.loadData();
      this.closeAll();
      this.toast.success(`✅ Đã xuất kho ${this.dialogQty} bình`);
    } else {
      this.toast.error('⚠️ Không đủ số lượng trong kho');
    }
  }

  confirmEdit(): void {
    if (!this.dialogItemSize || this.dialogQty < 0) return;
    this.inventoryService.setStock(this.dialogItemSize, this.dialogQty, this.dialogPrice, this.dialogNote);
    this.loadData();
    this.closeAll();
    this.toast.success(`✅ Đã cập nhật tồn kho`);
  }

  confirmReset(): void {
    if (confirm('Xóa toàn bộ tồn kho và lịch sử? Hành động này không thể hoàn tác.')) {
      this.inventoryService.resetAll();
      this.loadData();
      this.toast.success('✅ Đã xóa tồn kho');
    }
  }
}