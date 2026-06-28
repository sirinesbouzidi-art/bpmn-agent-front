import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarComponent } from './admin-sidebar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AdminSidebarComponent],
  template: `
    <div class="admin-layout">
      <app-admin-sidebar></app-admin-sidebar>
      <div class="admin-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      min-height: calc(100vh - 64px);
      background: #f4f6fb;
    }

    .admin-content {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
    }

    @media (max-width: 900px) {
      .admin-layout {
        flex-direction: column;
      }
    }
  `]
})
export class AdminLayoutComponent {}