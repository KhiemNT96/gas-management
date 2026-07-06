import { Injectable } from '@angular/core';
import { Customer } from '../../models/customer.model';
import { Order } from '../../models/order.model';
import { StorageService, InitialData } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class CustomerExcelService {
  constructor(private storage: StorageService) {}

  /**
   * Export ALL data to JSON (tải về)
   */
  exportAllToExcel(): void {
    this.storage.exportToJson();
  }

  /**
   * Import customers from JSON file
   */
  importFromExcel(file: File): Promise<{ imported: number; skipped: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as InitialData;
          const customers = data.customers || [];

          const result = { imported: 0, skipped: 0 };
          const existingCustomers = this.storage.getCollectionSnapshot<Customer>('customers');
          const existingPhones = new Set(existingCustomers.map(c => c.phone).filter(Boolean));

          let lastId = existingCustomers.reduce((max: number, c: Customer) => {
            const num = parseInt(c.id.replace('KH', ''), 10);
            return num > max ? num : max;
          }, 0);

          for (const row of customers) {
            if (!row.name || !row.name.toString().trim()) {
              result.skipped++;
              continue;
            }

            const phone = (row.phone || '').toString().trim();
            if (phone && existingPhones.has(phone)) {
              result.skipped++;
              continue;
            }

            lastId++;
            const now = new Date().toISOString();

            const customer: Customer = {
              id: 'KH' + String(lastId).padStart(3, '0'),
              name: row.name.toString().trim(),
              phone: phone,
              area: (row.area || '').toString().trim(),
              address: (row.address || '').toString().trim(),
              note: (row.note || '').toString().trim(),
              latitude: row.latitude || 15.4247,
              longitude: row.longitude || 108.8112,
              currentDebt: row.currentDebt || 0,
              gasDebt: row.gasDebt || 0,
              stoveDebt: row.stoveDebt || 0,
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
          reject(new Error('Không thể đọc file JSON. Vui lòng kiểm tra định dạng.'));
        }
      };

      reader.onerror = () => reject(new Error('Lỗi đọc file'));
      reader.readAsText(file);
    });
  }
}