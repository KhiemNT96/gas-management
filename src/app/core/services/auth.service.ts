import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, lastValueFrom } from 'rxjs';

export interface User {
  username: string;
  password: string;
  fullName: string;
  role: 'admin' | 'staff';
}

export interface AuthState {
  isLoggedIn: boolean;
  user: { username: string; fullName: string; role: string } | null;
}

const AUTH_KEY = 'gas_auth';
const USERS_PATH = 'assets/data/users.json';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authSubject = new BehaviorSubject<AuthState>({ isLoggedIn: false, user: null });
  authState$: Observable<AuthState> = this.authSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSession();
  }

  private loadSession(): void {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      if (saved) {
        const user = JSON.parse(saved);
        this.authSubject.next({ isLoggedIn: true, user });
      }
    } catch {}
  }

  get currentUser(): { username: string; fullName: string; role: string } | null {
    return this.authSubject.value.user;
  }

  get isLoggedIn(): boolean {
    return this.authSubject.value.isLoggedIn;
  }

  /**
   * Đăng nhập: kiểm tra username/password từ file users.json
   */
  async login(username: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const users = await lastValueFrom(
        this.http.get<User[]>(USERS_PATH)
      );

      const user = users.find(u => u.username === username && u.password === password);

      if (user) {
        const userInfo = { username: user.username, fullName: user.fullName, role: user.role };
        localStorage.setItem(AUTH_KEY, JSON.stringify(userInfo));
        this.authSubject.next({ isLoggedIn: true, user: userInfo });
        return { success: true, message: `Chào mừng ${user.fullName}!` };
      }

      return { success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' };
    } catch (err) {
      console.error('[Auth] Lỗi đọc users.json:', err);
      return { success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau' };
    }
  }

  /**
   * Đăng xuất
   */
  logout(): void {
    localStorage.removeItem(AUTH_KEY);
    this.authSubject.next({ isLoggedIn: false, user: null });
  }
}