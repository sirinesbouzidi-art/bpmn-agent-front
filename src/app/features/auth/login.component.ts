import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink  } from '@angular/router';
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
      <mat-card class="login-card">
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

          <button mat-flat-button color="primary" type="submit" [disabled]="loginForm.invalid">
            Login
          </button>

          <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
        </form>
        <!-- Dans login.component.html, après le formulaire -->
        <div class="register-link">
          <p>New to BPMN Studio? <a routerLink="/register">Create an account</a></p>
        </div>

        <div class="accounts">
          <p><strong>Admin:</strong> admin&#64;bouygues.com / admin123</p>
          <p><strong>User:</strong> user&#64;bouygues.com / user123</p>
        </div>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .login-wrapper {
        display: grid;
        place-items: center;
        min-height: calc(100vh - 90px);
        padding: 24px;
      }

      .login-card {
        max-width: 760px;
        width: 100%;
        border-radius: 16px;
        padding: 28px;
      }

      .title-wrap {
        margin-bottom: 8px;
      }

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
        font-size: 42px;
        line-height: 1.1;
      }

      p {
        margin: 10px 0 0;
        color: #5f6e8f;
      }

      form {
        display: grid;
         gap: 14px;
        margin: 20px 0 10px;
      }
      .register-link {
        text-align: center;
        margin: 16px 0;
      }

      .register-link a {
        color: #4f46e5;
        text-decoration: none;
        font-weight: 500;
      }

      .register-link a:hover {
        text-decoration: underline;
      }

      button {
        border-radius: 12px;
        min-height: 48px;
        font-weight: 600;
      }

      .error {
        color: #d32f2f;
        margin: 0;
      }

      .accounts {
        margin-top: 12px;
        padding-top: 14px;
        border-top: 1px solid #e2e8f5;
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
  this.authService.login(email, password).subscribe({
    next: () => {
      this.errorMessage = '';
      this.router.navigate(['/home']);
    },
    error: (err) => {
      this.errorMessage = 'Invalid credentials. Please use the mock accounts.';
    }
  });
}
}
