import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CustomerService } from '../../../core/services/customer.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { Customer } from '../../../models/customer.model';
import { Order, GAS_TYPE_LABELS, GAS_PRICES, DeliveryEvidence } from '../../../models/order.model';

@Component({
  selector: 'app-delivery-confirm',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, RouterLink, MatCardModule, MatButtonModule, MatInputModule, MatSelectModule, CurrencyPipe, DatePipe],
  templateUrl: './delivery-confirm.component.html',
  styleUrls: ['./delivery-confirm.component.css']
})
export class DeliveryConfirmComponent implements OnInit {
  customerId: string | null = null;
  customer: Customer | null = null;

  gasTypes = ['12kg', '45kg', '50kg'] as const;
  GAS_TYPE_LABELS = GAS_TYPE_LABELS;
  GAS_PRICES = GAS_PRICES;

  selectedGasType: string = '12kg';
  quantity = 1;
  unitPrice = 450000;
  paidAmount = 0;
  staffName = '';

  capturedPhoto: string | null = null;
  signatureData: string | null = null;
  showSignature = false;

  private isDrawing = false;
  private signCtx: CanvasRenderingContext2D | null = null;

  get totalAmount(): number {
    return this.unitPrice * this.quantity;
  }

  get remainingAmount(): number {
    return Math.max(0, this.totalAmount - (this.paidAmount || 0));
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private orderService: OrderService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.customerId = this.route.snapshot.paramMap.get('customerId');
    if (this.customerId) {
      this.customer = this.customerService.getById(this.customerId);
    }
  }

  onGasTypeChange(): void {
    this.unitPrice = GAS_PRICES[this.selectedGasType as keyof typeof GAS_PRICES] || 0;
    this.paidAmount = 0;
  }

  updatePaidAmount(): void {
    // Auto-clamp to total amount
    if (this.paidAmount > this.totalAmount) {
      this.paidAmount = this.totalAmount;
    }
  }

  capturePhoto(): void {
    // Try to use native camera
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          this.capturedPhoto = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  startSign(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.isDrawing = true;
    const canvas = event.target as HTMLCanvasElement;
    this.signCtx = canvas.getContext('2d');
    if (this.signCtx) {
      this.signCtx.strokeStyle = '#333';
      this.signCtx.lineWidth = 2;
      this.signCtx.lineCap = 'round';
      const pos = this.getPosition(event, canvas);
      this.signCtx.beginPath();
      this.signCtx.moveTo(pos.x, pos.y);
    }
  }

  drawSign(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing || !this.signCtx) return;
    const canvas = event.target as HTMLCanvasElement;
    const pos = this.getPosition(event, canvas);
    this.signCtx.lineTo(pos.x, pos.y);
    this.signCtx.stroke();
  }

  endSign(): void {
    this.isDrawing = false;
  }

  getPosition(event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in event) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top
      };
    }
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  clearSignature(): void {
    this.signCtx?.clearRect(0, 0, 300, 150);
    this.signatureData = null;
  }

  saveSignature(): void {
    const canvas = document.querySelector('.signature-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.signatureData = canvas.toDataURL('image/png');
      this.showSignature = false;
      this.toast.success('Đã lưu chữ ký');
    }
  }

  confirmDelivery(): void {
    if (!this.customerId || !this.customer || !this.staffName) return;

    const now = new Date().toISOString();
    const orderId = this.orderService.generateId();

    // Get current position
    navigator.geolocation.getCurrentPosition((position) => {
      const evidence: DeliveryEvidence = {
        id: 'EV' + orderId.substring(2),
        orderId,
        deliveryTime: now,
        photoUrl: this.capturedPhoto,
        signatureData: this.signatureData,
        gpsLatitude: position.coords.latitude || this.customer!.latitude,
        gpsLongitude: position.coords.longitude || this.customer!.longitude,
        deliveryStaffName: this.staffName,
        status: 'success',
        note: 'Giao hàng thành công'
      };

      const order: Order = {
        id: orderId,
        customerId: this.customerId!,
        customerName: this.customer!.name,
        orderDate: now,
        gasType: this.selectedGasType as any,
        quantity: this.quantity,
        unitPrice: this.unitPrice,
        totalAmount: this.totalAmount,
        paidAmount: this.paidAmount,
        debtAmount: this.totalAmount - this.paidAmount,
        paymentStatus: this.paidAmount >= this.totalAmount ? 'paid' : this.paidAmount > 0 ? 'partial' : 'unpaid',
        deliveryStatus: 'delivered',
        deliveryEvidence: evidence,
        note: '',
        createdAt: now,
        updatedAt: now
      };

      this.orderService.add(order);

      // Update customer debt
      const newDebt = (this.customer!.currentDebt || 0) + (this.totalAmount - this.paidAmount);
      this.customerService.update(this.customerId!, {
        currentDebt: Math.max(0, newDebt),
        lastPurchaseDate: now
      });

      this.toast.success('Xác nhận giao gas thành công!');
      this.router.navigate(['/dashboard']);
    }, () => {
      // Fallback if GPS not available
      const evidence: DeliveryEvidence = {
        id: 'EV' + orderId.substring(2),
        orderId,
        deliveryTime: now,
        photoUrl: this.capturedPhoto,
        signatureData: this.signatureData,
        gpsLatitude: this.customer!.latitude,
        gpsLongitude: this.customer!.longitude,
        deliveryStaffName: this.staffName,
        status: 'success',
        note: 'Giao hàng thành công'
      };

      const order: Order = {
        id: orderId,
        customerId: this.customerId!,
        customerName: this.customer!.name,
        orderDate: now,
        gasType: this.selectedGasType as any,
        quantity: this.quantity,
        unitPrice: this.unitPrice,
        totalAmount: this.totalAmount,
        paidAmount: this.paidAmount,
        debtAmount: this.totalAmount - this.paidAmount,
        paymentStatus: this.paidAmount >= this.totalAmount ? 'paid' : this.paidAmount > 0 ? 'partial' : 'unpaid',
        deliveryStatus: 'delivered',
        deliveryEvidence: evidence,
        note: '',
        createdAt: now,
        updatedAt: now
      };

      this.orderService.add(order);
      this.customerService.update(this.customerId!, {
        currentDebt: (this.customer!.currentDebt || 0) + (this.totalAmount - this.paidAmount),
        lastPurchaseDate: now
      });

      this.toast.success('Xác nhận giao gas thành công!');
      this.router.navigate(['/dashboard']);
    });
  }
}