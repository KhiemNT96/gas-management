import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [NgIf, FormsModule, MatCardModule, MatButtonModule, MatInputModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {
    // Nếu đã đăng nhập thì chuyển thẳng vào dashboard
    if (this.auth.isLoggedIn) {
      this.router.navigate(['/dashboard']);
    }
  }

  async onLogin(): Promise<void> {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Vui lòng nhập tên đăng nhập và mật khẩu';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const result = await this.auth.login(this.username.trim(), this.password);
      if (result.success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = result.message;
      }
    } catch {
      this.errorMessage = 'Lỗi kết nối, vui lòng thử lại';
    } finally {
      this.isLoading = false;
    }
  }
}