export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  area: string; // thôn/xóm/khu vực
  note: string; // ghi chú đường đi
  latitude: number;
  longitude: number;
  currentDebt: number; // tổng nợ = gasDebt + stoveDebt
  gasDebt: number;     // nợ bình gas
  stoveDebt: number;   // nợ bếp gas
  lastPurchaseDate: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
