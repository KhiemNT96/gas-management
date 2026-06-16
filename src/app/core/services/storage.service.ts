import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MOCK_CUSTOMERS } from '../../../assets/data/mock-customers';
import { MOCK_ORDERS } from '../../../assets/data/mock-orders';
import { Customer } from '../../models/customer.model';
import { Order } from '../../models/order.model';
import { Payment } from '../../models/payment.model';

export interface StorageCollections {
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
}

const STORAGE_PREFIX = 'gas_';

const COLLECTIONS: (keyof StorageCollections)[] = ['customers', 'orders', 'payments'];

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private subjects: { [key: string]: BehaviorSubject<any[]> } = {};

  constructor() {
    this.initializeData();
  }

  private initializeData(): void {
    // Initialize customers
    if (!localStorage.getItem(STORAGE_PREFIX + 'customers')) {
      localStorage.setItem(STORAGE_PREFIX + 'customers', JSON.stringify(MOCK_CUSTOMERS));
    }
    // Initialize orders
    if (!localStorage.getItem(STORAGE_PREFIX + 'orders')) {
      localStorage.setItem(STORAGE_PREFIX + 'orders', JSON.stringify(MOCK_ORDERS));
    }
    // Initialize payments
    if (!localStorage.getItem(STORAGE_PREFIX + 'payments')) {
      localStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify([]));
    }

    // Create observables for each collection
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

  add<T extends { id: string }>(collection: string, item: T): T {
    const data = this.getSnapshot(collection);
    data.push(item);
    localStorage.setItem(this.getStorageKey(collection), JSON.stringify(data));
    this.notify(collection);
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
    return updated;
  }

  delete(collection: string, id: string): boolean {
    const data = this.getSnapshot(collection);
    const index = data.findIndex((item: any) => item.id === id);
    if (index === -1) return false;

    data.splice(index, 1);
    localStorage.setItem(this.getStorageKey(collection), JSON.stringify(data));
    this.notify(collection);
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