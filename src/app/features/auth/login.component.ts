import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="login-wrapper">

      <!-- LEFT: full-bleed illustration -->
      <section class="illustration-panel">
        <div class="illustration-bg"></div>
      </section>

      <!-- RIGHT: clean form, no floating card -->
      <section class="form-panel">
        <div class="form-content">

          <div class="brand">
            <mat-icon>insights</mat-icon>
            <span>BPMN Telecom Studio</span>
          </div>

          <h1>login </h1>
          <p class="subtitle">
            Welcome to BPMN Telecom Studio.<br />
            Use the account provided by your administrator.
          </p>

          <form [formGroup]="loginForm" (ngSubmit)="submit()">
            <label class="field-label">E-mail</label>
            <mat-form-field appearance="outline" class="full-width">
              <input matInput type="email" formControlName="email" placeholder="your.email@bouygues.com" />
            </mat-form-field>

            <label class="field-label">Password</label>
            <mat-form-field appearance="outline" class="full-width">
              <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" placeholder="Password" />
              <button type="button" mat-icon-button matSuffix (click)="hidePassword = !hidePassword" tabindex="-1">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <button mat-flat-button type="submit" class="submit-btn" [disabled]="loginForm.invalid">
              Sign in
            </button>

            <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
          </form>

        </div>
      </section>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 55% 45%;
    }

    /* ============== LEFT ILLUSTRATION PANEL ============== */
    .illustration-panel {
      position: relative;
      background: #fafbfc;
      overflow: hidden;
    }

    .illustration-bg {
      position: absolute;
      inset: 0;
      background-image:
      linear-gradient(160deg, rgba(26, 26, 77, 0.55) 0%, rgba(45, 27, 105, 0.5) 55%, rgba(15, 15, 51, 0.65) 100%), url('/assets/images.jpg');
      background-size: cover;
      background-position: center;
    }

    /* ============== RIGHT FORM PANEL ============== */
    .form-panel {
      background: #f4f5f7;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .form-content {
      width: 100%;
      max-width: 380px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 16px;
      color: #1a1a4d;
      margin-bottom: 56px;
    }

    .brand mat-icon {
      color: #1a1a4d;
    }

    h1 {
      margin: 0 0 12px;
      font-size: 34px;
      font-weight: 500;
      color: #1e293b;
    }

    .subtitle {
      margin: 0 0 36px;
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
    }

    form {
      display: flex;
      flex-direction: column;
    }

    .field-label {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
    }

    .full-width {
      width: 100%;
    }

    ::ng-deep .mat-mdc-form-field-outline {
      border-radius: 8px;
    }

    ::ng-deep .mat-mdc-text-field-wrapper {
      border-radius: 8px;
      background: #ffffff;
    }

    mat-form-field {
      margin-bottom: 18px;
    }

    .submit-btn {
      background: #1a1a4d;
      color: #ffffff;
      border-radius: 8px;
      height: 48px;
      font-weight: 600;
      font-size: 15px;
      margin-top: 16px;
      transition: all 0.2s ease;
    }

    .submit-btn:hover:not(:disabled) {
      background: #2d1b69;
    }

    .submit-btn:disabled {
      background: #cbd5e1;
    }

    .error {
      color: #ef4444;
      font-size: 13px;
      text-align: center;
      margin: 12px 0 0;
    }

    /* ============== RESPONSIVE ============== */
    @media (max-width: 900px) {
      .login-wrapper {
        grid-template-columns: 1fr;
      }

      .illustration-panel {
        display: none;
      }

      .form-panel {
        padding: 24px;
      }
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  errorMessage = '';
  hidePassword = true;

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