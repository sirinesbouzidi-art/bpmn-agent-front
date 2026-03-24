import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="register-wrapper">
      <mat-card class="register-card">
        <div class="title-wrap">
          <span class="pill">New to BPMN Studio?</span>
          <h1>Create account</h1>
          <p>Join Bouygues Telecom BPMN generator.</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" />
            <mat-icon matSuffix>mail</mat-icon>
            <mat-error *ngIf="registerForm.get('email')?.hasError('required')">
              Email is required
            </mat-error>
            <mat-error *ngIf="registerForm.get('email')?.hasError('email')">
              Please enter a valid email
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" />
            <mat-icon matSuffix>lock</mat-icon>
            <mat-error *ngIf="registerForm.get('password')?.hasError('required')">
              Password is required
            </mat-error>
            <mat-error *ngIf="registerForm.get('password')?.hasError('minlength')">
              Password must be at least 6 characters
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Confirm Password</mat-label>
            <input matInput type="password" formControlName="confirmPassword" />
            <mat-icon matSuffix>lock</mat-icon>
            <mat-error *ngIf="registerForm.hasError('mismatch')">
              Passwords do not match
            </mat-error>
          </mat-form-field>

          <button 
            mat-flat-button 
            color="primary" 
            type="submit" 
            [disabled]="registerForm.invalid || isLoading">
            <span *ngIf="!isLoading">Create account</span>
            <mat-spinner diameter="24" *ngIf="isLoading"></mat-spinner>
          </button>

          <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
        </form>

        <!-- LIEN VERS LOGIN -->
        <div class="login-link">
          <p>Already have an account? <a routerLink="/login">Sign in</a></p>
        </div>

        <div class="accounts">
          <p><strong>Demo accounts:</strong></p>
          <p>Admin: admin&#64;bouygues.com / admin123</p>
          <p>User: user&#64;bouygues.com / user123</p>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-wrapper {
      display: grid;
      place-items: center;
      min-height: calc(100vh - 90px);
      padding: 24px;
    }
    .register-card {
      max-width: 500px;
      width: 100%;
      border-radius: 16px;
      padding: 28px;
    }
    .title-wrap { margin-bottom: 24px; }
    .pill {
      display: inline-block;
      border-radius: 999px;
      padding: 6px 12px;
      margin-bottom: 10px;
      font-size: 12px;
      font-weight: 600;
      color: #4f46e5;
      background: #eef2ff;
    }
    h1 {
      margin: 0;
      font-size: 32px;
      line-height: 1.1;
    }
    p {
      margin: 10px 0 0;
      color: #5f6e8f;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin: 20px 0 10px;
    }
    button {
      border-radius: 12px;
      min-height: 48px;
      font-weight: 600;
      position: relative;
    }
    button mat-spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .error {
      color: #d32f2f;
      margin: 0;
      text-align: center;
    }
    .login-link {
      text-align: center;
      margin: 16px 0;
    }
    .login-link a {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 500;
    }
    .login-link a:hover {
      text-decoration: underline;
    }
    .accounts {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f5;
      font-size: 13px;
      color: #5d6a7c;
    }
    .accounts p {
      margin: 4px 0;
    }
  `]
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isLoading = false;
  errorMessage = '';

  readonly registerForm = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: this.passwordMatchValidator }
  );

  passwordMatchValidator(group: any) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  submit(): void {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.registerForm.getRawValue();

    this.authService.register(email, password).subscribe({
      next: () => {
        this.isLoading = false;
        // 👇 NOUVEAU COMPORTEMENT : Rediriger vers login avec message de succès
        this.router.navigate(['/login'], { 
          queryParams: { registered: 'success' } 
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || err.message || 'Registration failed';
        console.error('Register error:', err);
      }
    });
  }
}