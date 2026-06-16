export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  note: string;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'transfer' | 'other';