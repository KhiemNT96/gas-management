import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore, Firestore,
  collection, getDocs, doc,
  setDoc, deleteDoc,
  query, orderBy,
  writeBatch
} from 'firebase/firestore';
import { environment } from '../../../environments/environment';
import { Customer } from '../../models/customer.model';
import { Order } from '../../models/order.model';
import { Payment } from '../../models/payment.model';

export interface FirebaseData {
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
}

const COLLECTIONS_MAP = {
  customers: 'customers',
  orders: 'orders',
  payments: 'payments'
} as const;

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private initialized = false;

  constructor() {
    this.initFirebase();
  }

  private initFirebase(): void {
    try {
      const config = environment.firebase;
      if (!config.apiKey || config.apiKey === 'YOUR_API_KEY') {
        console.warn('[Firebase] Chưa cấu hình Firebase. Bỏ qua đồng bộ.');
        return;
      }
      this.app = initializeApp(config);
      this.db = getFirestore(this.app);
      this.initialized = true;
      console.log('[Firebase] Đã kết nối thành công!');
    } catch (err) {
      console.warn('[Firebase] Lỗi khởi tạo:', err);
    }
  }

  get isConnected(): boolean {
    return this.initialized && this.db !== null;
  }

  /**
   * Đọc toàn bộ dữ liệu từ Firestore
   */
  async loadAll(): Promise<FirebaseData> {
    if (!this.isConnected) {
      return { customers: [], orders: [], payments: [] };
    }

    try {
      const data: FirebaseData = {
        customers: [],
        orders: [],
        payments: []
      };

      for (const [key, colName] of Object.entries(COLLECTIONS_MAP)) {
        const colRef = collection(this.db!, colName);
        const q = query(colRef, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        data[key as keyof FirebaseData] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as any;
      }

      console.log('[Firebase] Đã tải dữ liệu từ Firestore');
      return data;
    } catch (err) {
      console.warn('[Firebase] Lỗi tải dữ liệu:', err);
      return { customers: [], orders: [], payments: [] };
    }
  }

  /**
   * Ghi toàn bộ dữ liệu lên Firestore (dùng batch)
   */
  async saveAll(data: FirebaseData): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      // Dùng batch write để ghi nhanh
      for (const [key, colName] of Object.entries(COLLECTIONS_MAP)) {
        const items = data[key as keyof FirebaseData] as any[];
        const batch = writeBatch(this.db!);

        for (const item of items) {
          const docRef = doc(this.db!, colName, item.id);
          batch.set(docRef, item, { merge: true });
        }

        await batch.commit();
      }

      console.log('[Firebase] Đã đồng bộ dữ liệu lên Firestore');
      return true;
    } catch (err) {
      console.warn('[Firebase] Lỗi ghi dữ liệu:', err);
      return false;
    }
  }

  /**
   * Thêm 1 item vào collection
   */
  async addItem(collectionName: string, item: any): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const colName = COLLECTIONS_MAP[collectionName as keyof typeof COLLECTIONS_MAP];
      if (!colName) return false;

      const docRef = doc(this.db!, colName, item.id);
      await setDoc(docRef, item);
      return true;
    } catch (err) {
      console.warn(`[Firebase] Lỗi thêm ${collectionName}:`, err);
      return false;
    }
  }

  /**
   * Cập nhật 1 item
   */
  async updateItem(collectionName: string, id: string, changes: any): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const colName = COLLECTIONS_MAP[collectionName as keyof typeof COLLECTIONS_MAP];
      if (!colName) return false;

      const docRef = doc(this.db!, colName, id);
      await setDoc(docRef, changes, { merge: true });
      return true;
    } catch (err) {
      console.warn(`[Firebase] Lỗi cập nhật ${collectionName}:`, err);
      return false;
    }
  }

  /**
   * Xóa 1 item
   */
  async deleteItem(collectionName: string, id: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const colName = COLLECTIONS_MAP[collectionName as keyof typeof COLLECTIONS_MAP];
      if (!colName) return false;

      const docRef = doc(this.db!, colName, id);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.warn(`[Firebase] Lỗi xóa ${collectionName}:`, err);
      return false;
    }
  }
}