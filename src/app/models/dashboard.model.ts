export interface DashboardStats {
  totalCustomers: number;
  totalOrders: number;
  totalBottlesSold: number;
  totalDebt: number;
  debtCustomerCount: number;
  deliveredToday: number;
}

export interface MonthlySales {
  month: string;
  total: number;
  bottles: number;
}