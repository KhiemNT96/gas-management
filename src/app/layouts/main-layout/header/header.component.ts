import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { DatePipe, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [DatePipe, NgIf],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']})
export class HeaderComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();
  currentTime = new Date();
  userName = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userName = this.auth.currentUser?.fullName || '';
    // Cập nhật thời gian mỗi phút
    setInterval(() => {
      this.currentTime = new Date();
    }, 60000);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}