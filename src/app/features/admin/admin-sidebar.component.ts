import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <aside class="admin-sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">
          <mat-icon>insights</mat-icon>
        </div>
        <div>
          <p class="brand-name">BPMN Telecom Studio</p>
          <p class="brand-sub">Admin Panel</p>
        </div>
      </div>

      <nav class="sidebar-nav">
        <a class="nav-item" routerLink="/admin/dashboard" routerLinkActive="active">
          <mat-icon>dashboard</mat-icon>
          Dashboard
        </a>
        <a class="nav-item" routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          <mat-icon>group</mat-icon>
          Team Management
        </a>
        <a class="nav-item" routerLink="/admin/activity-logs" routerLinkActive="active">
          <mat-icon>list_alt</mat-icon>
          Activity Logs
        </a>
      </nav>

      <div class="sidebar-footer">
        <p>© 2026 BPMN Agent</p>
        <p>All rights reserved.</p>
      </div>
    </aside>
  `,
  styles: [`
    .admin-sidebar {
      width: 260px;
      min-height: 100%;
      background: linear-gradient(180deg, #1e1b4b 0%, #312e81 100%);
      color: #ffffff;
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 8px 24px;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .brand-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .brand-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #ffffff;
    }

    .brand-name {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
    }

    .brand-sub {
      margin: 0;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.55);
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: 10px;
      color: rgba(255, 255, 255, 0.75);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .nav-item mat-icon {
      font-size: 19px;
      width: 19px;
      height: 19px;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #ffffff;
    }

    .nav-item.active {
      background: #4f46e5;
      color: #ffffff;
    }

    .sidebar-footer {
      padding: 16px 8px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 11px;
      color: rgba(255, 255, 255, 0.45);
    }

    .sidebar-footer p {
      margin: 0 0 2px;
    }
  `]
})
export class AdminSidebarComponent {}