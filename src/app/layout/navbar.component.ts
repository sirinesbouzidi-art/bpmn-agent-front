import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { BpmnService } from '../core/services/bpmn.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, RouterLink, RouterLinkActive],
  template: `
    <mat-toolbar class="navbar" *ngIf="isAuthenticated()">
      <span class="brand" routerLink="/home">
        <mat-icon>insights</mat-icon>
        BPMN Telecom Studio
      </span>
      <span class="spacer"></span>
      <div class="nav-links">
        <a mat-button routerLink="/about" routerLinkActive="active">About</a>
        <a mat-button routerLink="/home" routerLinkActive="active">Home</a>
        <a mat-button routerLink="/history" routerLinkActive="active">History</a>
      </div>
      <button
        mat-flat-button
        color="primary"
        class="deploy-btn"
        [disabled]="!hasCurrentModel() || isDeploying"
        (click)="deployCurrentModel()"
      >
        {{ isDeploying ? 'Deploying...' : 'Deploy BPMN' }}
      </button>
      <button mat-stroked-button class="logout-btn" (click)="logout()">
        <mat-icon>logout</mat-icon>
        Logout
      </button>
    </mat-toolbar>
  `,
  styles: [
    `
      .navbar {
       display: flex;
        gap: 12px;
        position: sticky;
        top: 10px;
        z-index: 10;
        width: calc(100% - 24px);
        margin: 10px auto 0;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.7);
        background: linear-gradient(110deg, rgba(79, 70, 229, 0.9), rgba(6, 182, 212, 0.85));
        color: #fff;
        box-shadow: 0 14px 28px rgba(24, 50, 100, 0.2);
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        letter-spacing: 0.2px;
        cursor: pointer;
      }
         .nav-links {
        display: inline-flex;
        gap: 4px;
      }

      .spacer {
        flex: 1;
      }
        .active {
        font-weight: 600;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
      }

     .logout-btn {
        color: #fff;
        border-color: rgba(255, 255, 255, 0.6);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
      }
     .deploy-btn {
        border-radius: 999px;
      }


      @media (max-width: 768px) {
        .navbar {
          top: 0;
          width: 100%;
          margin: 0;
          border-radius: 0;
          padding: 8px 10px;
        }

        .brand {
          font-size: 14px;
        }

        .nav-links {
          gap: 0;
        }

        .logout-btn {
          min-width: auto;
          padding: 0 10px;
        }
      }
    `
  ]
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly bpmnService = inject(BpmnService);
  private readonly router = inject(Router);

  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());
  readonly hasCurrentModel = computed(() => this.bpmnService.currentModel() !== null);

  isDeploying = false;

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  deployCurrentModel(): void {
    const currentModel = this.bpmnService.currentModel();
    if (!currentModel || this.isDeploying) {
      return;
    }

    this.isDeploying = true;

    this.bpmnService
      .deployXml(currentModel.xml)
      .pipe(finalize(() => (this.isDeploying = false)))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            return;
          }

          setTimeout(() => {
            window.open('http://localhost:8081', '_blank');
          }, 1000);
        },
        error: () => undefined
      });
  }
}