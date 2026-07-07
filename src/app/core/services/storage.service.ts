import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Customer } from '../../models/customer.model';
import { Order } from '../../models/order.model';
import { Payment } from '../../models/payment.model';
import { FirebaseService, FirebaseData } from './firebase.service';

export interface StorageCollections {
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
}

export interface InitialData {
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
}

const STORAGE_PREFIX = 'gas_';
const INIT_DATA_PATH = 'assets/data/initial-data.json';
const SYNC_KEY = STORAGE_PREFIX + 'last_sync';

const COLLECTIONS: (keyof StorageCollections)[] = ['customers', 'orders', 'payments'];

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private subjects: { [key: string]: BehaviorSubject<any[]> } = {};
  private initialized = false;

  constructor(
    private http: HttpClient,
    private firebase: FirebaseService
  ) {
    this.initializeData();
  }

  private async initializeData(): Promise<void> {
    // Bước 1: Thử load từ Firebase trước (nếu có cấu hình)
    if (this.firebase.isConnected) {
      try {
        const fbData = await this.firebase.loadAll();
        const hasFbData = fbData.customers.length > 0 || fbData.orders.length > 0 || fbData.payments.length > 0;

        if (hasFbData) {
          // So sánh với localStorage, lấy dữ liệu mới nhất
          const localData = this.getLocalData();
          const mergedData = this.mergeData(localData, fbData);

          // Lưu vào localStorage
          this.saveToLocal(mergedData);
          this.createSubjects();
          console.log('[Storage] Đã tải dữ liệu từ Firebase');
          return;
        }
      } catch (err) {
        console.warn('[Storage] Lỗi tải từ Firebase, dùng localStorage:', err);
      }
    }

    // Bước 2: Kiểm tra localStorage
    const hasCustomers = !!localStorage.getItem(STORAGE_PREFIX + 'customers');
    const hasOrders = !!localStorage.getItem(STORAGE_PREFIX + 'orders');
    const hasPayments = !!localStorage.getItem(STORAGE_PREFIX + 'payments');

    if (hasCustomers && hasOrders && hasPayments) {
      this.createSubjects();
      return;
    }

    // Bước 3: Load từ file JSON khởi tạo
    try {
      const data = await lastValueFrom(
        this.http.get<InitialData>(INIT_DATA_PATH)
      );

      if (data.customers?.length > 0) {
        localStorage.setItem(STORAGE_PREFIX + 'customers', JSON.stringify(data.customers));
      }
      if (data.orders?.length > 0) {
        localStorage.setItem(STORAGE_PREFIX + 'orders', JSON.stringify(data.orders));
      }
      if (data.payments?.length > 0) {
        localStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify(data.payments));
      }

      // Đồng bộ lên Firebase nếu có kết nối
      if (this.firebase.isConnected) {
        this.firebase.saveAll({
          customers: data.customers || [],
          orders: data.orders || [],
          payments: data.payments || []
        });
      }
    } catch (err) {
      console.warn('[Storage] Không thể load initial-data.json, dùng dữ liệu rỗng:', err);
    }

    // Đảm bảo các collection luôn tồn tại
    if (!localStorage.getItem(STORAGE_PREFIX + 'customers')) {
      localStorage.setItem(STORAGE_PREFIX + 'customers', JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_PREFIX + 'orders')) {
      localStorage.setItem(STORAGE_PREFIX + 'orders', JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_PREFIX + 'payments')) {
      localStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify([]));
    }

    this.createSubjects();
  }

  /**
   * Merge dữ liệu, ưu tiên dữ liệu mới hơn (dựa trên updatedAt)
   */
  private mergeData(local: InitialData, fb: InitialData): InitialData {
    const mergeArray = (localArr: any[], fbArr: any[]) => {
      const map = new Map<string, any>();

      // Thêm local trước
      for (const item of localArr) {
        map.set(item.id, item);
      }
      // Ghi đè bằng Firebase nếu mới hơn
      for (const item of fbArr) {
        const existing = map.get(item.id);
        if (!existing || (item.updatedAt && existing.updatedAt && item.updatedAt > existing.updatedAt)) {
          map.set(item.id, item);
        }
      }

      return Array.from(map.values());
    };

    return {
      customers: mergeArray(local.customers, fb.customers),
      orders: mergeArray(local.orders, fb.orders),
      payments: mergeArray(local.payments, fb.payments)
    };
  }

  private getLocalData(): InitialData {
    return {
      customers: this.getSnapshot('customers'),
      orders: this.getSnapshot('orders'),
      payments: this.getSnapshot('payments')
    };
  }

  private saveToLocal(data: InitialData): void {
    if (data.customers) {
      localStorage.setItem(STORAGE_PREFIX + 'customers', JSON.stringify(data.customers));
    }
    if (data.orders) {
      localStorage.setItem(STORAGE_PREFIX + 'orders', JSON.stringify(data.orders));
    }
    if (data.payments) {
      localStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify(data.payments));
    }
  }

  private createSubjects(): void {
    if (this.initialized) return;
    this.initialized = true;

    COLLECTIONS.forEach(key => {
      const data = this.getSnapshot(key);
      this.subjects[key] = new BehaviorSubject<any[]>(data);
    });
  }

  private getStorageKey(collection: string): string {
    return STORAGE_PREFIX + collection;
  }

  private getSnapshot(collection: string): any[] {
    const data = localStorage.getItem(this.getStorageKey(collection));
    return data ? JSON.parse(data) : [];
  }

  private notify(collection: string): void {
    const data = this.getSnapshot(collection);
    if (this.subjects[collection]) {
      this.subjects[collection].next(data);
    }
  }

  getCollectionSnapshot<T>(collection: string): T[] {
    return this.getSnapshot(collection) as T[];
  }

  getCollection<T>(collection: string): Observable<T[]> {
    if (!this.subjects[collection]) {
      const data = this.getSnapshot(collection);
      this.subjects[collection] = new BehaviorSubject<any[]>(data);
    }
    return this.subjects[collection].asObservable();
  }

  getById<T>(collection: string, id: string): T | null {
    const data = this.getSnapshot(collection);
    return data.find((item: any) => item.id === id) || null;
  }

  /**
   * Export dữ liệu ra file JSON (tải về)
   */
  exportToJson(): void {
    const data: InitialData = {
      customers: this.getCollectionSnapshot<Customer>('customers'),
      orders: this.getCollectionSnapshot<Order>('orders'),
      payments: this.getCollectionSnapshot<Payment>('payments'),
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().split('T')[0];
    a.download = `gas_data_${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import dữ liệu từ file JSON
   */
  importFromJson(file: File): Promise<InitialData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as InitialData;

          if (data.customers) {
            localStorage.setItem(this.getStorageKey('customers'), JSON.stringify(data.customers));
            this.notify('customers');
          }
          if (data.orders) {
            localStorage.setItem(this.getStorageKey('orders'), JSON.stringify(data.orders));
            this.notify('orders');
          }
          if (data.payments) {
            localStorage.setItem(this.getStorageKey('payments'), JSON.stringify(data.payments));
            this.notify('payments');
          }

          // Đồng bộ lên Firebase
          this.syncToFirebase();

          resolve(data);
        } catch (err) {
          reject(new Error('Không thể đọc file JSON. Vui lòng kiểm tra định dạng.'));
        }
      };
      reader.onerror = () => reject(new Error('Lỗi đọc file'));
      reader.readAsText(file);
    });
  }

  /**
   * Đồng bộ dữ liệu hiện tại lên Firebase
   */
  async syncToFirebase(): Promise<boolean> {
    if (!this.firebase.isConnected) return false;

    const data: FirebaseData = {
      customers: this.getCollectionSnapshot<Customer>('customers'),
      orders: this.getCollectionSnapshot<Order>('orders'),
      payments: this.getCollectionSnapshot<Payment>('payments'),
    };

    return await this.firebase.saveAll(data);
  }

  add<T extends { id: string }>(collection: string, item: T): T {
    const data = this.getSnapshot(collection);
    data.push(item);
    localStorage.setItem(this.getStorageKey(collection), JSON.stringify(data));
    this.notify(collection);

    // Đồng bộ lên Firebase
    this.firebase.addItem(collection, item);

    return item;
  }

  update<T>(collection: string, id: string, changes: Partial<T>): T | null {
    const data = this.getSnapshot(collection);
    const index = data.findIndex((item: any) => item.id === id);
    if (index === -1) return null;

    const updated = {
      ...data[index],
      ...changes,
      updatedAt: new Date().toISOString()
    };
    data[index] = updated;
    localStorage.setItem(this.getStorageKey(collection), JSON.stringify(data));
    this.notify(collection);

    // Đồng bộ lên Firebase
    this.firebase.updateItem(collection, id, updated);

    return updated;
  }

  delete(collection: string, id: string): boolean {
    const data = this.getSnapshot(collection);
    const index = data.findIndex((item: any) => item.id === id);
    if (index === -1) return false;

    data.splice(index, 1);
    localStorage.setItem(this.getStorageKey(collection), JSON.stringify(data));
    this.notify(collection);

    // Đồng bộ lên Firebase
    this.firebase.deleteItem(collection, id);

    return true;
  }

  query<T>(collection: string, predicate: (item: T) => boolean): T[] {
    const data = this.getSnapshot(collection);
    return data.filter(predicate);
  }

  clearCollection(collection: string): void {
    localStorage.removeItem(this.getStorageKey(collection));
    this.notify(collection);
  }
}