import { Injectable } from '@angular/core';

export interface BrandPrice {
  brand: string;
  price: number;
  note: string; // đặc điểm nhận diện
}

export interface GasPriceGroup {
  id: string;
  label: string;
  items: BrandPrice[];
}

const STORAGE_KEY = 'gas_prices_v2';
const META_KEY = 'gas_prices_meta';

const DEFAULT_GROUPS: GasPriceGroup[] = [
  {
    id: '12kg',
    label: 'Bình dân dụng 12kg',
    items: [
      { brand: 'Petrolimex', price: 578664, note: 'Bình màu xanh hoặc xám, chữ P nổi, logo giọt nước xanh' },
      { brand: 'Saigon Petro (SP)', price: 639500, note: 'Vỏ bình màu xám, đỏ, xanh hoặc vàng' },
      { brand: 'PV Gas (PetroVietnam)', price: 641000, note: 'Bình màu hồng, thương hiệu Gas Dầu Khí (Gas South)' },
      { brand: 'Pacific Petro', price: 682000, note: 'Vỏ bình màu vàng, đỏ' },
      { brand: 'Bình đỏ Elf', price: 660000, note: 'Bình màu đỏ, thương hiệu Elf Gas' },
      { brand: 'Bình gas Hoàng Sa', price: 655000, note: 'Bình màu xanh, thương hiệu Hoàng Sa Gas' },
    ]
  }
];

export interface PriceMeta {
  lastUpdated: string | null;
  source: string | null;
}

const SOURCE_URLS = [
  { name: 'Petrolimex Hà Nội', url: 'https://gaspetrolimex-hanoi.vn/gia-gas-moi-nhat-hom-nay' },
  { name: 'Gas Lửa Xanh', url: 'https://gasluaxanh.com/gia-gas/' },
];

@Injectable({
  providedIn: 'root'
})
export class GasPriceService {
  private groups: GasPriceGroup[];
  private meta: PriceMeta;

  constructor() {
    this.groups = this.loadFromStorage();
    this.meta = this.loadMeta();
  }

  private loadFromStorage(): GasPriceGroup[] {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return this.cloneDefaults();
      }
    }
    return this.cloneDefaults();
  }

  private cloneDefaults(): GasPriceGroup[] {
    return DEFAULT_GROUPS.map(g => ({
      ...g,
      items: g.items.map(i => ({ ...i }))
    }));
  }

  private loadMeta(): PriceMeta {
    const saved = localStorage.getItem(META_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { lastUpdated: null, source: null };
      }
    }
    return { lastUpdated: null, source: null };
  }

  getGroups(): GasPriceGroup[] {
    return this.groups.map(g => ({
      ...g,
      items: g.items.map(i => ({ ...i }))
    }));
  }

  getMeta(): PriceMeta {
    return { ...this.meta };
  }

  updatePrice(groupId: string, brand: string, newPrice: number): void {
    const group = this.groups.find(g => g.id === groupId);
    if (group) {
      const item = group.items.find(i => i.brand === brand);
      if (item) {
        item.price = newPrice;
        this.meta = { lastUpdated: new Date().toISOString(), source: 'Nhập tay' };
        this.saveAll();
      }
    }
  }

  resetToDefault(): void {
    this.groups = this.cloneDefaults();
    this.meta = { lastUpdated: null, source: null };
    this.saveAll();
  }

  async fetchFromMarket(): Promise<{ success: boolean; message: string }> {
    const proxies = ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?'];

    for (const proxy of proxies) {
      for (const source of SOURCE_URLS) {
        try {
          const url = proxy + encodeURIComponent(source.url);
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) continue;

          const html = await response.text();
          const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

          // Parse giá 12kg
          const price12k = this.extractPriceNear(text, [/12\s*kg/i, /bình.*12/i, /dân.*dụng/i]);

          let updatedCount = 0;

          if (price12k > 0) {
            const g12 = this.groups.find(g => g.id === '12kg');
            if (g12 && g12.items.length > 0) {
              const target = g12.items.find(i => i.brand.includes('Petrolimex')) || g12.items[0];
              target.price = price12k;
              updatedCount++;
            }
          }

          if (updatedCount > 0) {
            this.meta = { lastUpdated: new Date().toISOString(), source: source.name };
            this.saveAll();
            return {
              success: true,
              message: `✅ Đã cập nhật ${updatedCount} mức giá từ ${source.name}`
            };
          }
        } catch {
          continue;
        }
      }
    }

    return {
      success: false,
      message: '⚠️ Không thể lấy giá từ thị trường. Vui lòng nhập tay hoặc thử lại sau.'
    };
  }

  private extractPriceNear(text: string, keywords: RegExp[]): number {
    // Tìm vị trí keyword xuất hiện
    for (const kw of keywords) {
      const match = kw.exec(text);
      if (match) {
        const idx = match.index;
        // Tìm giá trong vòng 200 ký tự xung quanh
        const chunk = text.substring(Math.max(0, idx - 100), idx + 200);
        const priceRegex = /(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*(?:₫|đ|vnđ|VND|đồng)/gi;
        let pm: RegExpExecArray | null;
        while ((pm = priceRegex.exec(chunk)) !== null) {
          const num = parseInt(pm[1].replace(/\./g, '').replace(/,/g, ''));
          if (num > 50000 && num < 5000000) {
            return num;
          }
        }
      }
    }
    return 0;
  }

  private saveAll(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.groups));
    localStorage.setItem(META_KEY, JSON.stringify(this.meta));
  }
}