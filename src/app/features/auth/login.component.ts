import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="login-wrapper">
      <div class="glass-board">
        <!-- LEFT PANEL -->
        <section class="brand-panel">
          <div class="brand-content">
            <div class="brand-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h2>BPMN STUDIO</h2>
            <div class="tagline">
              <span>Transform your business processes</span>
              <span>with AI-powered automation</span>
            </div>
            <div class="features">
              <div class="feature-item">
                <mat-icon>check_circle</mat-icon>
                <span>Intelligent Process Generation</span>
              </div>
              <div class="feature-item">
                <mat-icon>check_circle</mat-icon>
                <span>Real-time BPMN Visualization</span>
              </div>
              <div class="feature-item">
                <mat-icon>check_circle</mat-icon>
                <span>Export to XML & SVG</span>
              </div>
            </div>
          </div>
        </section>

        <!-- RIGHT PANEL -->
        <section class="form-panel">
          <mat-card class="login-card">
            <div class="register-top-link">
              <p>New to BPMN Studio? <a routerLink="/register">Create an account</a></p>
            </div>

            <div class="title-wrap">
              <span class="pill">Welcome back</span>
              <h1>Sign in</h1>
              <p>Use one of the mock Bouygues Telecom accounts.</p>
            </div>

            <form [formGroup]="loginForm" (ngSubmit)="submit()">
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" />
                <mat-icon matSuffix>mail</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Password</mat-label>
                <input matInput type="password" formControlName="password" />
                <mat-icon matSuffix>lock</mat-icon>
              </mat-form-field>

              <button mat-flat-button type="submit" [disabled]="loginForm.invalid">
                Login
              </button>

              <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
            </form>

            
          </mat-card>
        </section>
      </div>
    </div>
  `,
  styles: [`
    /* BACKGROUND */
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      padding: 20px;
    }

    /* MAIN CONTAINER */
    .glass-board {
      width: min(1100px, 95%);
      display: grid;
      grid-template-columns: 1fr 1.1fr;
      border-radius: 20px;
      overflow: hidden;
      background: white;
      box-shadow: 0 20px 50px rgba(0,0,0,0.1);
    }

    /* LEFT PANEL - MÊME COULEUR QUE REGISTER */
    .brand-panel {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 48px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
    }

    .brand-content {
      position: relative;
      z-index: 1;
    }

    .brand-icon {
      width: 64px;
      height: 64px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 32px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .brand-panel h2 {
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 16px 0;
      letter-spacing: -0.5px;
      color: white;
    }

    .tagline {
      margin-bottom: 40px;
    }

    .tagline span {
      display: block;
      font-size: 16px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.9);
    }

    .tagline span:first-child {
      font-weight: 500;
      font-size: 18px;
      color: white;
      margin-bottom: 8px;
    }

    .features {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
    }

    .feature-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #c4b5fd;
    }

    /* RIGHT PANEL */
    .form-panel {
      background: #f8fafc;
      padding: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .login-card {
      width: 100%;
      max-width: 500px;
      background: white;
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
    }

    /* REGISTER TOP LINK - INSIDE CARD */
    .register-top-link {
      text-align: right;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e2e8f0;
    }

    .register-top-link p {
      margin: 0;
      font-size: 14px;
      color: #64748b;
    }

    .register-top-link a {
      color: #4f46e5;
      font-weight: 600;
      text-decoration: none;
    }

    .register-top-link a:hover {
      text-decoration: underline;
    }

    .title-wrap {
      margin-bottom: 24px;
    }

    .pill {
      background: #eef2ff;
      color: #4f46e5;
      padding: 6px 12px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 500;
      display: inline-block;
      margin-bottom: 16px;
    }

    .title-wrap h1 {
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #0f172a;
      letter-spacing: -0.5px;
    }

    .title-wrap p {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-top: 0;
    }

    ::ng-deep .mat-mdc-form-field {
      width: 100%;
    }

    ::ng-deep .mat-mdc-form-field-outline {
      border-radius: 12px;
    }

    button {
      background: linear-gradient(90deg, #4f46e5, #7c3aed);
      color: white;
      border-radius: 12px;
      height: 48px;
      font-weight: 600;
      font-size: 15px;
      margin-top: 8px;
      transition: all 0.2s ease;
    }

    button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 10px 20px -10px rgba(79, 70, 229, 0.4);
    }

    button:disabled {
      background: linear-gradient(90deg, #cbd5e1, #94a3b8);
    }

    .accounts {
      font-size: 13px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      margin-top: 24px;
    }

    .accounts p {
      margin: 8px 0;
    }

    .accounts strong {
      color: #334155;
    }

    .error {
      color: #ef4444;
      font-size: 13px;
      text-align: center;
      margin: 8px 0 0;
    }

    /* RESPONSIVE */
    @media (max-width: 900px) {
      .glass-board {
        grid-template-columns: 1fr;
        border-radius: 24px;
      }

      .brand-panel {
        padding: 40px;
        text-align: center;
      }

      .brand-icon {
        margin: 0 auto 32px;
      }

      .feature-item {
        justify-content: center;
      }

      .form-panel {
        padding: 32px;
      }

      .login-card {
        padding: 24px;
      }
    }

    @media (max-width: 480px) {
      .brand-panel {
        padding: 32px;
      }

      .form-panel {
        padding: 24px;
      }

      .login-card {
        padding: 20px;
      }

      .title-wrap h1 {
        font-size: 28px;
      }
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  errorMessage = '';

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  submit(): void {
    const { email, password } = this.loginForm.getRawValue();

    this.authService.login(email, password).subscribe({
      next: () => {
        this.errorMessage = '';
        this.router.navigate(['/home']);
      },
      error: () => {
        this.errorMessage = 'Invalid credentials. Please use the mock accounts.';
      }
    });
  }
}