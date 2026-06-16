import { Injectable } from '@angular/core';

export interface InventoryItem {
  size: string;
  label: string;
  quantity: number;
  lastUpdated: string;
  note: string;
}

export interface InventoryTransaction {
  id: string;
  date: string;
  type: 'nhập' | 'xuất' | 'sửa';
  itemSize: string;
  itemLabel: string;
  quantity: number;
  price: number;
  note: string;
}

const STORAGE_KEY = 'gas_inventory';
const TX_KEY = 'gas_inventory_tx';

const DEFAULT_INVENTORY: InventoryItem[] = [
  { size: 'petrolimex-xanh-12', label: 'Petrolimex xanh 12', quantity: 0, lastUpdated: new Date().toISOString(), note: '' },
  { size: 'petrolimex-xanh-13', label: 'Petrolimex xanh 13', quantity: 0, lastUpdated: new Date().toISOString(), note: '' },
  { size: 'sp-xam', label: 'Xám Saigon Petro (SP)', quantity: 0, lastUpdated: new Date().toISOString(), note: '' },
  { size: 'sp-do', label: 'Đỏ Saigon Petro (SP)', quantity: 0, lastUpdated: new Date().toISOString(), note: '' },
  { size: 'pv-gas-hong', label: 'Hồng PV Gas', quantity: 0, lastUpdated: new Date().toISOString(), note: '' },
  { size: 'petrolimex-hong', label: 'Petrolimex hồng', quantity: 0, lastUpdated: new Date().toISOString(), note: '' },
  { size: 'elf-do', label: 'Đỏ Elf', quantity: 0, lastUpdated: new Date().toISOString(), note: '' },
];

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private items: InventoryItem[];
  private transactions: InventoryTransaction[];

  constructor() {
    this.items = this.loadFromStorage();
    this.transactions = this.loadTransactions();
  }

  private loadFromStorage(): InventoryItem[] {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return this.cloneDefaults();
      }
    }
    return this.cloneDefaults();
  }

  private cloneDefaults(): InventoryItem[] {
    return DEFAULT_INVENTORY.map(i => ({ ...i, lastUpdated: new Date().toISOString() }));
  }

  private loadTransactions(): InventoryTransaction[] {
    const saved = localStorage.getItem(TX_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  }

  getItems(): InventoryItem[] {
    return this.items.map(i => ({ ...i }));
  }

  getTransactions(): InventoryTransaction[] {
    return [...this.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getQuantity(size: string): number {
    const item = this.items.find(i => i.size === size);
    return item ? item.quantity : 0;
  }

  addStock(size: string, quantity: number, price: number, note: string = ''): void {
    const item = this.items.find(i => i.size === size);
    if (item) {
      item.quantity += quantity;
      item.lastUpdated = new Date().toISOString();
      if (note) item.note = note;
      this.addTransaction('nhập', size, item.label, quantity, price, note);
      this.saveToStorage();
    }
  }

  removeStock(size: string, quantity: number, price: number, note: string = ''): boolean {
    const item = this.items.find(i => i.size === size);
    if (item) {
      if (item.quantity < quantity) return false;
      item.quantity -= quantity;
      item.lastUpdated = new Date().toISOString();
      this.addTransaction('xuất', size, item.label, quantity, price, note);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  setStock(size: string, quantity: number, price: number, note: string = ''): void {
    const item = this.items.find(i => i.size === size);
    if (item) {
      const diff = quantity - item.quantity;
      item.quantity = Math.max(0, quantity);
      item.lastUpdated = new Date().toISOString();
      if (note) item.note = note;
      if (diff !== 0) {
        this.addTransaction('sửa', size, item.label, diff, price, note || `Điều chỉnh từ ${item.quantity - diff} lên ${quantity}`);
      }
      this.saveToStorage();
    }
  }

  resetAll(): void {
    this.items = DEFAULT_INVENTORY.map(i => ({ ...i, quantity: 0, lastUpdated: new Date().toISOString(), note: '' }));
    this.transactions = [];
    this.saveToStorage();
    localStorage.removeItem(TX_KEY);
  }

  private addTransaction(type: 'nhập' | 'xuất' | 'sửa', itemSize: string, itemLabel: string, quantity: number, price: number, note: string): void {
    const tx: InventoryTransaction = {
      id: 'TX' + Date.now(),
      date: new Date().toISOString(),
      type,
      itemSize,
      itemLabel,
      quantity,
      price: price || 0,
      note: note || '',
    };
    this.transactions.push(tx);
    localStorage.setItem(TX_KEY, JSON.stringify(this.transactions));
  }

  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
  }
}