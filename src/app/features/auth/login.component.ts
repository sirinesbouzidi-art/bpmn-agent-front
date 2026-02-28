import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="login-wrapper">
      <mat-card class="login-card">
        <h1>Sign in</h1>
        <p>Use one of the mock Bouygues Telecom accounts.</p>

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

          <button mat-flat-button color="primary" type="submit" [disabled]="loginForm.invalid">
            Login
          </button>

          <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
        </form>

        <div class="accounts">
          <p><strong>Admin:</strong> admin@bouygues.com / admin123</p>
          <p><strong>User:</strong> user@bouygues.com / user123</p>
        </div>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .login-wrapper {
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 16px;
      }

      .login-card {
        max-width: 440px;
        width: 100%;
        border-radius: 16px;
      }

      form {
        display: grid;
        gap: 12px;
        margin: 12px 0;
      }

      .error {
        color: #d32f2f;
        margin: 0;
      }

      .accounts {
        margin-top: 16px;
        font-size: 13px;
        color: #5d6a7c;
      }
    `
  ]
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
    const isLogged = this.authService.login(email, password);

    if (!isLogged) {
      this.errorMessage = 'Invalid credentials. Please use one of the mock accounts.';
      return;
    }

    this.errorMessage = '';
    this.router.navigate(['/home']);
  }
}
