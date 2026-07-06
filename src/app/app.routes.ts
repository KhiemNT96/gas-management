import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component')
      .then(m => m.LoginComponent),
    title: 'Đăng nhập'
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component')
      .then(m => m.MainLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent),
        title: 'Tổng quan'
      },
      {
        path: 'customers',
        loadComponent: () => import('./features/customers/customer-list/customer-list.component')
          .then(m => m.CustomerListComponent),
        title: 'Quản lý khách hàng'
      },
      {
        path: 'customers/new',
        loadComponent: () => import('./features/customers/customer-form/customer-form.component')
          .then(m => m.CustomerFormComponent),
        title: 'Thêm khách hàng'
      },
      {
        path: 'customers/:id',
        loadComponent: () => import('./features/customers/customer-detail/customer-detail.component')
          .then(m => m.CustomerDetailComponent),
        title: 'Chi tiết khách hàng'
      },
      {
        path: 'customers/:id/edit',
        loadComponent: () => import('./features/customers/customer-form/customer-form.component')
          .then(m => m.CustomerFormComponent),
        title: 'Sửa khách hàng'
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/order-list/order-list.component')
          .then(m => m.OrderListComponent),
        title: 'Đơn hàng'
      },
      {
        path: 'orders/new',
        loadComponent: () => import('./features/orders/order-form/order-form.component')
          .then(m => m.OrderFormComponent),
        title: 'Tạo đơn hàng'
      },
      {
        path: 'delivery',
        loadComponent: () => import('./features/delivery/delivery-search/delivery-search.component')
          .then(m => m.DeliverySearchComponent),
        title: 'Giao gas'
      },
      {
        path: 'delivery/route/:customerId',
        loadComponent: () => import('./features/delivery/delivery-route/delivery-route.component')
          .then(m => m.DeliveryRouteComponent),
        title: 'Đường đi giao gas'
      },
      {
        path: 'delivery/confirm/:customerId',
        loadComponent: () => import('./features/delivery/delivery-confirm/delivery-confirm.component')
          .then(m => m.DeliveryConfirmComponent),
        title: 'Xác nhận giao gas'
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/inventory/inventory.component')
          .then(m => m.InventoryComponent),
        title: 'Kho gas'
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component')
          .then(m => m.SettingsComponent),
        title: 'Cài đặt'
      },
      {
        path: 'debts',
        loadComponent: () => import('./features/debts/debt-list/debt-list.component')
          .then(m => m.DebtListComponent),
        title: 'Công nợ'
      },
      {
        path: '**',
        redirectTo: 'dashboard'
      }
    ]
  }
];
