import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { Customer } from '../../models/customer.model';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private collection = 'customers';

  constructor(private storage: StorageService) {}

  getAll(): Observable<Customer[]> {
    return this.storage.getCollection<Customer>(this.collection);
  }

  getById(id: string): Customer | null {
    return this.storage.getById<Customer>(this.collection, id);
  }

  search(query: string): Observable<Customer[]> {
    const q = query.toLowerCase().trim();
    return this.storage.getCollection<Customer>(this.collection).pipe(
      map(customers => customers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address.toLowerCase().includes(q)
      ))
    );
  }

  getByArea(area: string): Observable<Customer[]> {
    return this.storage.getCollection<Customer>(this.collection).pipe(
      map(customers => customers.filter(c => c.area === area))
    );
  }

  getDebtCustomers(): Observable<Customer[]> {
    return this.storage.getCollection<Customer>(this.collection).pipe(
      map(customers => customers.filter(c => c.currentDebt > 0))
    );
  }

  getGasDebtCustomers(): Observable<Customer[]> {
    return this.storage.getCollection<Customer>(this.collection).pipe(
      map(customers => customers.filter(c => c.gasDebt > 0))
    );
  }

  getStoveDebtCustomers(): Observable<Customer[]> {
    return this.storage.getCollection<Customer>(this.collection).pipe(
      map(customers => customers.filter(c => c.stoveDebt > 0))
    );
  }

  add(customer: Customer): Customer {
    return this.storage.add(this.collection, customer);
  }

  update(id: string, changes: Partial<Customer>): Customer | null {
    return this.storage.update(this.collection, id, changes);
  }

  delete(id: string): boolean {
    return this.storage.delete(this.collection, id);
  }

  updateDebt(customerId: string, amount: number): void {
    const customer = this.getById(customerId);
    if (customer) {
      const newDebt = (customer.currentDebt || 0) + amount;
      this.update(customerId, { currentDebt: Math.max(0, newDebt) });
    }
  }

  updateGasDebt(customerId: string, amount: number): void {
    const customer = this.getById(customerId);
    if (customer) {
      const gasDebt = Math.max(0, (customer.gasDebt || 0) + amount);
      this.update(customerId, {
        gasDebt,
        currentDebt: gasDebt + (customer.stoveDebt || 0)
      });
    }
  }

  updateStoveDebt(customerId: string, amount: number): void {
    const customer = this.getById(customerId);
    if (customer) {
      const stoveDebt = Math.max(0, (customer.stoveDebt || 0) + amount);
      this.update(customerId, {
        stoveDebt,
        currentDebt: stoveDebt + (customer.gasDebt || 0)
      });
    }
  }

  generateId(): string {
    const customers = this.storage.getCollectionSnapshot<Customer>(this.collection);
    const maxId = customers.reduce((max: number, c: Customer) => {
      const num = parseInt(c.id.replace('KH', ''), 10);
      return num > max ? num : max;
    }, 0);
    return 'KH' + String(maxId + 1).padStart(3, '0');
  }
}