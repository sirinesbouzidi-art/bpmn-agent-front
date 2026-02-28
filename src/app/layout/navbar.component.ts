import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, RouterLink, RouterLinkActive],
  template: `
    <mat-toolbar class="navbar" *ngIf="isAuthenticated()">
      <span class="brand" routerLink="/home">BPMN Telecom Studio</span>
      <span class="spacer"></span>
      <a mat-button routerLink="/home" routerLinkActive="active">Home</a>
      <a mat-button routerLink="/viewer" routerLinkActive="active">Viewer</a>
      <a mat-button routerLink="/history" routerLinkActive="active">History</a>
      <button mat-stroked-button color="warn" (click)="logout()">
        <mat-icon>logout</mat-icon>
        Logout
      </button>
    </mat-toolbar>
  `,
  styles: [
    `
      .navbar {
        background: #0b2a5b;
        color: white;
        position: sticky;
        top: 0;
        z-index: 5;
      }

      .brand {
        font-weight: 600;
        cursor: pointer;
      }

      .spacer {
        flex: 1;
      }

      .active {
        font-weight: 600;
      }

      button {
        margin-left: 8px;
        color: white;
        border-color: rgba(255, 255, 255, 0.6);
      }
    `
  ]
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
