import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Customer } from '../../models/customer.model';
import { Order } from '../../models/order.model';
import { StorageService } from './storage.service';

interface CustomerRow {
  'Tên khách hàng': string;
  'Số điện thoại'?: string;
  'Khu vực'?: string;
  'Địa chỉ'?: string;
  'Ghi chú'?: string;
  'Nợ (VNĐ)'?: number;
  'Nợ bình gas'?: number;
  'Nợ bếp gas'?: number;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerExcelService {
  constructor(private storage: StorageService) {}

  /**
   * Export ALL data to Excel with multiple tabs:
   * - Khách hàng: danh sách KH
   * - Công nợ: các KH còn nợ
   * - Lịch sử mua hàng: tất cả đơn hàng
   */
  exportAllToExcel(): void {
    const customers = this.storage.getCollectionSnapshot<Customer>('customers');
    const orders = this.storage.getCollectionSnapshot<Order>('orders');
    const fileName = `gas_quang_ngai_${new Date().toISOString().split('T')[0]}.xlsx`;

    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    // ---- Tab 1: Khách hàng ----
    const customerData = customers.map((c, i) => ({
      'STT': i + 1,
      'Mã KH': c.id,
      'Tên khách hàng': c.name,
      'Số điện thoại': c.phone || '',
      'Khu vực': c.area || '',
      'Địa chỉ': c.address || '',
      'Ghi chú': c.note || '',
      'Nợ (VNĐ)': c.currentDebt || 0,
      'Lần mua gần nhất': c.lastPurchaseDate
        ? new Date(c.lastPurchaseDate).toLocaleDateString('vi-VN')
        : '',
    }));
    const wsCustomers = XLSX.utils.json_to_sheet(customerData);
    wsCustomers['!cols'] = [
      { wch: 5 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
      { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsCustomers, 'Khách hàng');

    // ---- Tab 2: Công nợ ----
    const debtCustomers = customers.filter(c => c.currentDebt > 0);
    const debtData = debtCustomers.map((c, i) => ({
      'STT': i + 1,
      'Mã KH': c.id,
      'Tên khách hàng': c.name,
      'Số điện thoại': c.phone || '',
      'Khu vực': c.area || '',
      'Địa chỉ': c.address || '',
      'Nợ (VNĐ)': c.currentDebt,
      'Ngày cập nhật': c.updatedAt
        ? new Date(c.updatedAt).toLocaleDateString('vi-VN')
        : '',
    }));
    const wsDebts = XLSX.utils.json_to_sheet(debtData);
    wsDebts['!cols'] = [
      { wch: 5 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDebts, 'Công nợ');

    // ---- Tab 3: Lịch sử mua hàng ----
    const orderData = orders
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .map((o, i) => ({
        'STT': i + 1,
        'Mã đơn': o.id,
        'Mã KH': o.customerId,
        'Tên khách hàng': o.customerName,
        'Ngày mua': new Date(o.orderDate).toLocaleDateString('vi-VN'),
        'Loại bình': o.gasType,
        'Số lượng': o.quantity,
        'Đơn giá': o.unitPrice,
        'Thành tiền': o.totalAmount,
        'Đã thanh toán': o.paidAmount,
        'Còn nợ': o.debtAmount,
        'Trạng thái giao': o.deliveryStatus === 'delivered' ? 'Đã giao' : 'Chưa giao',
        'Thanh toán': o.paymentStatus === 'paid' ? 'Đã trả' : o.paymentStatus === 'partial' ? 'Trả một phần' : 'Chưa trả',
      }));
    const wsOrders = XLSX.utils.json_to_sheet(orderData);
    wsOrders['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 25 },
      { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Lịch sử mua hàng');

    // Download
    XLSX.writeFile(wb, fileName);
  }

  /**
   * Export only customers (simple version)
   */
  exportToExcel(customers: Customer[]): void {
    const data = customers.map((c, i) => ({
      'STT': i + 1,
      'Mã KH': c.id,
      'Tên khách hàng': c.name,
      'Số điện thoại': c.phone || '',
      'Khu vực': c.area || '',
      'Địa chỉ': c.address || '',
      'Ghi chú': c.note || '',
      'Nợ (VNĐ)': c.currentDebt || 0,
      'Lần mua gần nhất': c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toLocaleDateString('vi-VN') : '',
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 5 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
      { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 18 },
    ];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Khách hàng');
    XLSX.writeFile(wb, `khach_hang_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * Import customers from Excel file
   * Chỉ đọc sheet "Khách hàng" để nhập
   */
  importFromExcel(file: File): Promise<{ imported: number; skipped: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: 'array' });

          // Find sheet name that matches "Khách hàng" or use first sheet
          const sheetName = workbook.SheetNames.find(n => n.includes('Khách')) || workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<CustomerRow>(sheet);

          const result = { imported: 0, skipped: 0 };
          const existingCustomers = this.storage.getCollectionSnapshot<Customer>('customers');
          const existingPhones = new Set(existingCustomers.map(c => c.phone).filter(Boolean));

          let lastId = existingCustomers.reduce((max: number, c: Customer) => {
            const num = parseInt(c.id.replace('KH', ''), 10);
            return num > max ? num : max;
          }, 0);

          for (const row of rows) {
            if (!row['Tên khách hàng'] || !row['Tên khách hàng'].toString().trim()) {
              result.skipped++;
              continue;
            }

            const phone = (row['Số điện thoại'] || '').toString().trim();
            if (phone && existingPhones.has(phone)) {
              result.skipped++;
              continue;
            }

            lastId++;
            const now = new Date().toISOString();

            const customer: Customer = {
              id: 'KH' + String(lastId).padStart(3, '0'),
              name: row['Tên khách hàng'].toString().trim(),
              phone: phone,
              area: (row['Khu vực'] || '').toString().trim(),
              address: (row['Địa chỉ'] || '').toString().trim(),
              note: (row['Ghi chú'] || '').toString().trim(),
              latitude: 15.4247,
              longitude: 108.8112,
              currentDebt: row['Nợ (VNĐ)'] || 0,
              gasDebt: row['Nợ bình gas'] || 0,
              stoveDebt: row['Nợ bếp gas'] || 0,
              lastPurchaseDate: null,
              photoUrl: null,
              createdAt: now,
              updatedAt: now,
            };

            this.storage.add('customers', customer);
            if (phone) existingPhones.add(phone);
            result.imported++;
          }

          resolve(result);
        } catch {
          reject(new Error('Không thể đọc file Excel. Vui lòng kiểm tra định dạng.'));
        }
      };

      reader.onerror = () => reject(new Error('Lỗi đọc file'));
      reader.readAsArrayBuffer(file);
    });
  }
}