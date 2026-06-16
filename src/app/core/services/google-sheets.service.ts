import { Injectable } from '@angular/core';

export interface GoogleSheetsConfig {
  /** Sheet ID (lấy từ URL: /d/{SHEET_ID}/edit) */
  sheetId: string;
  /** Bật/tắt online sync */
  enabled: boolean;
}

export type CollectionName = 'customers' | 'orders' | 'payments' | 'inventory' | 'inventoryTx' | 'settings';

/**
 * Service kết nối Google Sheets dùng:
 * - CSV Export để đọc (File → Share → Publish to web → CSV)
 * - Google Form để ghi (submit dữ liệu mới)
 * 
 * Không cần API key, không CORS, hoàn toàn miễn phí.
 */
@Injectable({
  providedIn: 'root'
})
export class GoogleSheetsService {
  private config: GoogleSheetsConfig = {
    sheetId: '',
    enabled: false
  };

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const saved = localStorage.getItem('gas_gsheets_config');
      if (saved) {
        const cfg = JSON.parse(saved);
        this.config = { ...this.config, ...cfg };
      }
    } catch {}
  }

  setConfig(config: Partial<GoogleSheetsConfig>): void {
    this.config = { ...this.config, ...config };
    localStorage.setItem('gas_gsheets_config', JSON.stringify(this.config));
  }

  isEnabled(): boolean {
    return this.config.enabled && !!this.config.sheetId;
  }

  getSheetId(): string {
    return this.config.sheetId;
  }

  /**
   * Đọc dữ liệu từ Google Sheet qua CSV Export (không CORS).
   * Sheet phải được publish (File → Share → Publish to web → Entire Document → CSV)
   */
  async downloadSheetData(gid: number = 0): Promise<any[]> {
    if (!this.isEnabled()) return [];

    try {
      // CSV export URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}
      const url = `https://docs.google.com/spreadsheets/d/${this.config.sheetId}/export?format=csv&gid=${gid}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const csvText = await response.text();
      return this.parseCSV(csvText);
    } catch (err) {
      console.warn('[GoogleSheets] Download error:', err);
      return [];
    }
  }

  /**
   * Parse CSV text thành mảng objects
   */
  private parseCSV(csvText: string): any[] {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 2) return [];

    const headers = this.parseCSVLine(lines[0]);
    const result: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const row: any = {};
      for (let j = 0; j < headers.length && j < values.length; j++) {
        row[headers[j]] = values[j];
      }
      result.push(row);
    }

    return result;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Đồng bộ toàn bộ dữ liệu từ Google Sheet về localStorage
   */
  async syncAll(): Promise<void> {
    if (!this.isEnabled()) return;

    // Sheet1 (gid=0) = customers
    const data = await this.downloadSheetData(0);
    if (data.length > 0) {
      localStorage.setItem('gas_gsheets_customers', JSON.stringify(data));
    }
  }
}