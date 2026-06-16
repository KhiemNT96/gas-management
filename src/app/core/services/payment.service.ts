import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { Payment } from '../../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private collection = 'payments';

  constructor(private storage: StorageService) {}

  getAll(): Observable<Payment[]> {
    return this.storage.getCollection<Payment>(this.collection);
  }

  getByCustomerId(customerId: string): Observable<Payment[]> {
    return this.storage.getCollection<Payment>(this.collection).pipe(
      map(payments => payments
        .filter(p => p.customerId === customerId)
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      )
    );
  }

  getByOrderId(orderId: string): Observable<Payment[]> {
    return this.storage.getCollection<Payment>(this.collection).pipe(
      map(payments => payments.filter(p => p.orderId === orderId))
    );
  }

  add(payment: Payment): Payment {
    return this.storage.add(this.collection, payment);
  }

  delete(id: string): boolean {
    return this.storage.delete(this.collection, id);
  }
}