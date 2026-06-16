import { Component, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  currentTime = new Date();
}