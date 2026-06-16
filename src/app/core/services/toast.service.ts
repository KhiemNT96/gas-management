import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<Toast | null>(null);

  show(message: string, type: Toast['type'] = 'info', duration: number = 3000): void {
    this.toastSubject.next({ message, type, duration });
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 5000);
  }

  warning(message: string): void {
    this.show(message, 'warning', 4000);
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  getToast(): Observable<Toast | null> {
    return this.toastSubject.asObservable();
  }

  dismiss(): void {
    this.toastSubject.next(null);
  }
}