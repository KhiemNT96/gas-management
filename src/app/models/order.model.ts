export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  gasType: GasType;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  deliveryEvidence: DeliveryEvidence | null;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type GasType = '12kg' | '45kg' | '50kg';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type DeliveryStatus = 'pending' | 'delivering' | 'delivered' | 'cancelled';

export interface DeliveryEvidence {
  id: string;
  orderId: string;
  deliveryTime: string;
  photoUrl: string | null;
  signatureData: string | null; // base64 image
  gpsLatitude: number;
  gpsLongitude: number;
  deliveryStaffName: string;
  status: 'success' | 'failed';
  note: string;
}

export const GAS_PRICES: Record<GasType, number> = {
  '12kg': 450000,
  '45kg': 1650000,
  '50kg': 1850000
};

export const GAS_TYPE_LABELS: Record<GasType, string> = {
  '12kg': 'Bình 12kg',
  '45kg': 'Bình 45kg',
  '50kg': 'Bình 50kg'
};