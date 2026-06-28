import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    RouterLinkActive
  ],
  template: `
    <mat-toolbar class="navbar" *ngIf="isAuthenticated() && !isAuthPage()">
      <span class="brand" routerLink="/home">
        <mat-icon>insights</mat-icon>
        BPMN Telecom Studio
      </span>
      <span class="spacer"></span>

      <div class="nav-links">
        <a class="nav-link" routerLink="/home" routerLinkActive="active">
          <mat-icon>home</mat-icon>
          Home
        </a>
        <a class="nav-link" routerLink="/history" routerLinkActive="active">
          <mat-icon>history</mat-icon>
          History
        </a>
        <a class="nav-link" *ngIf="isAdmin()" routerLink="/admin" routerLinkActive="active">
          <mat-icon>admin_panel_settings</mat-icon>
          Admin
        </a>
      </div>

      <button class="profile-btn" [matMenuTriggerFor]="profileMenu">
        <span class="avatar">{{ userInitials() }}</span>
        <span class="profile-name">{{ userLabel() }}</span>
        <mat-icon class="chevron">expand_more</mat-icon>
      </button>

      <mat-menu #profileMenu="matMenu">
        <button mat-menu-item disabled class="menu-email">{{ userEmail() }}</button>
        <button mat-menu-item (click)="logout()">
          <mat-icon>logout</mat-icon>
          <span>Logout</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [
    `
      .navbar {
        display: flex;
        align-items: center;
        gap: 16px;
        height: 64px;
        padding: 0 24px;
        background: linear-gradient(110deg, #1e1b4b 0%, #312e81 100%);
        color: #fff;
        box-shadow: 0 2px 12px rgba(15, 15, 51, 0.15);
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        font-size: 16px;
        letter-spacing: 0.2px;
        cursor: pointer;
      }

      .spacer {
        flex: 1;
      }

      .nav-links {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-right: 12px;
      }

      .nav-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 999px;
        color: rgba(255, 255, 255, 0.78);
        font-size: 14px;
        font-weight: 500;
        text-decoration: none;
        transition: background 0.15s ease, color 0.15s ease;
      }

      .nav-link mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .nav-link:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
      }

      .nav-link.active {
        background: #ffffff;
        color: #4f46e5;
      }

      .nav-link.active mat-icon {
        color: #4f46e5;
      }

      .profile-btn {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 999px;
        padding: 4px 12px 4px 4px;
        cursor: pointer;
        color: #ffffff;
      }

      .avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #f4c9c0;
        color: #312e81;
        font-size: 12px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .profile-name {
        font-size: 14px;
        font-weight: 500;
      }

      .chevron {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: rgba(255, 255, 255, 0.7);
      }

      .menu-email {
        font-size: 12px;
        color: #64748b;
        opacity: 1 !important;
      }

      @media (max-width: 768px) {
        .navbar {
          padding: 0 12px;
          gap: 8px;
        }

        .brand {
          font-size: 14px;
        }

        .nav-link span,
        .profile-name {
          display: none;
        }

        .nav-link {
          padding: 8px;
        }
      }
    `
  ]
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  userEmail(): string {
    return this.authService.currentUser()?.email ?? '';
  }

  userLabel(): string {
    const email = this.userEmail();
    if (!email) return 'Account';
    const namePart = email.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }

  userInitials(): string {
    const email = this.userEmail();
    if (!email) return '?';
    const namePart = email.split('@')[0];
    return namePart.slice(0, 2).toUpperCase();
  }

  isAuthPage(): boolean {
    return (
      this.router.url.startsWith('/login') ||
      this.router.url.startsWith('/register') ||
      this.router.url.startsWith('/about')
    );
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}