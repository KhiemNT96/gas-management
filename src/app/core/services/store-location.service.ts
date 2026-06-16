import { Injectable } from '@angular/core';

export interface StoreLocation {
  lat: number;
  lng: number;
  address?: string;
}

const STORAGE_KEY = 'gas_store_location';
const DEFAULT_LOCATION: StoreLocation = { lat: 15.4247, lng: 108.8112 };

@Injectable({
  providedIn: 'root'
})
export class StoreLocationService {
  private location: StoreLocation;

  constructor() {
    this.location = this.loadFromStorage();
  }

  private loadFromStorage(): StoreLocation {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { ...DEFAULT_LOCATION };
      }
    }
    return { ...DEFAULT_LOCATION };
  }

  getLocation(): StoreLocation {
    return { ...this.location };
  }

  saveLocation(location: StoreLocation): void {
    this.location = { ...location };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.location));
  }
}