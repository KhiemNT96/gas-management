import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { Order, GAS_PRICES } from '../../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private collection = 'orders';

  constructor(private storage: StorageService) {}

  getAll(): Observable<Order[]> {
    return this.storage.getCollection<Order>(this.collection);
  }

  getById(id: string): Order | null {
    return this.storage.getById<Order>(this.collection, id);
  }

  getByCustomerId(customerId: string): Observable<Order[]> {
    return this.storage.getCollection<Order>(this.collection).pipe(
      map(orders => orders
        .filter(o => o.customerId === customerId)
        .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      )
    );
  }

  getRecentByCustomerId(customerId: string, limit: number = 5): Observable<Order[]> {
    return this.getByCustomerId(customerId).pipe(
      map(orders => orders.slice(0, limit))
    );
  }

  getTodayDeliveries(): Observable<Order[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.storage.getCollection<Order>(this.collection).pipe(
      map(orders => orders.filter(o =>
        o.orderDate.startsWith(today) && o.deliveryStatus === 'delivered'
      ))
    );
  }

  getPendingDeliveries(): Observable<Order[]> {
    return this.storage.getCollection<Order>(this.collection).pipe(
      map(orders => orders.filter(o =>
        o.deliveryStatus === 'pending' || o.deliveryStatus === 'delivering'
      ))
    );
  }

  getTotalBottlesSold(): Observable<number> {
    return this.storage.getCollection<Order>(this.collection).pipe(
      map(orders => orders.reduce((sum, o) => sum + o.quantity, 0))
    );
  }

  getTotalRevenue(): Observable<number> {
    return this.storage.getCollection<Order>(this.collection).pipe(
      map(orders => orders.reduce((sum, o) => sum + o.totalAmount, 0))
    );
  }

  calculateTotal(gasType: string, quantity: number): number {
    const unitPrice = GAS_PRICES[gasType as keyof typeof GAS_PRICES] || 0;
    return unitPrice * quantity;
  }

  add(order: Order): Order {
    return this.storage.add(this.collection, order);
  }

  update(id: string, changes: Partial<Order>): Order | null {
    return this.storage.update(this.collection, id, changes);
  }

  delete(id: string): boolean {
    return this.storage.delete(this.collection, id);
  }

  generateId(): string {
    const orders = this.storage.getCollectionSnapshot<Order>(this.collection);
    const maxId = orders.reduce((max: number, o: Order) => {
      const num = parseInt(o.id.replace('DH', ''), 10);
      return num > max ? num : max;
    }, 0);
    return 'DH' + String(maxId + 1).padStart(3, '0');
  }
}