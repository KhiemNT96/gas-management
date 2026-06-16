import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass, NgIf],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']})
export class ToastComponent implements OnInit, OnDestroy {
  toast: Toast | null = null;
  private subscription: Subscription | null = null;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.getToast().subscribe(t => {
      this.toast = t;
      if (t && t.duration) {
        setTimeout(() => this.dismiss(), t.duration);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  dismiss(): void {
    this.toastService.dismiss();
  }
}