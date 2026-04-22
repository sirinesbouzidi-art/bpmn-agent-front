import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="register-layout">
      <section class="benefits-panel">
        <h2 class="brand">BPMN STUDIO</h2>
        <video class="brand-video" controls preload="metadata">
          <source src="/assets/bpmn.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div class="benefits-content">
          <p class="intro">Create your free BPMN Studio account</p>
          <h3>this account allows you to:</h3>
          <ul>
            <li>Transform business requirements into executable BPMN models using artificial intelligence</li>
            <li>Access interactive process visualization with export to standard formats (XML / SVG)</li>
            <li>Accelerate telecom process digitalization with a simple and intelligent solution</li>
          </ul>
        </div>
      </section>

      <section class="form-panel">
        <mat-card class="register-card">
          <div class="login-top-link">
            <p>Already have an account? <a routerLink="/login">Log in</a></p>
          </div>

          <div class="title-wrap">
            <h1>Create Your BPMN Studio Account</h1>
            <p class="subtitle">Start modeling faster with your team in one workspace.</p>
          </div>

          <form [formGroup]="registerForm" (ngSubmit)="submit()">
            <div class="name-row">
              <mat-form-field appearance="outline">
                <mat-label>First Name</mat-label>
                <input matInput type="text" formControlName="firstName" />
                <mat-error *ngIf="registerForm.get('firstName')?.hasError('required')">
                  First name is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Last Name</mat-label>
                <input matInput type="text" formControlName="lastName" />
                <mat-error *ngIf="registerForm.get('lastName')?.hasError('required')">
                  Last name is required
                </mat-error>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" />
              <mat-error *ngIf="registerForm.get('email')?.hasError('required')">
                Email is required
              </mat-error>
              <mat-error *ngIf="registerForm.get('email')?.hasError('email')">
                Please enter a valid email
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Password (min 6 characters)</mat-label>
              <input matInput type="password" formControlName="password" />
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
              <mat-error *ngIf="registerForm.hasError('mismatch')">
                Passwords do not match
              </mat-error>
            </mat-form-field>

            <mat-checkbox formControlName="marketingOptIn" class="marketing-optin">
              I would like to receive updates on BPMN Studio products and offers.
            </mat-checkbox>

            <button
              mat-flat-button
              color="primary"
              class="submit-btn"
              type="submit"
              [disabled]="registerForm.invalid || isLoading">
              <span *ngIf="!isLoading">Sign up</span>
              <mat-spinner diameter="24" *ngIf="isLoading"></mat-spinner>
            </button>

            <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>

            <p class="legal-note">
              By signing up, you agree to our <a routerLink="/about">Terms</a> and <a routerLink="/about">Privacy Policy</a>.
            </p>
          </form>
        </mat-card>
      </section>
    </div> 
  `,
  styles: [`
    /* MAIN LAYOUT */
    .register-layout {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr 1.1fr;
      max-width: 1100px;
      margin: auto;
      background: white;
      box-shadow: 0 20px 50px rgba(0,0,0,0.1);
      border-radius: 20px;
      overflow: hidden;
    }

    /* LEFT PANEL */
    .benefits-panel {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      padding: 40px 30px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    /* TITLE */
    .brand {
      font-size: 28px;
      margin: 0;
      letter-spacing: 1px;
    }

    /* VIDEO */
    .brand-video {
      width: 320px;
      margin: 30px auto;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.2);
    }

    /* CONTENT */
    .benefits-content {
      margin-top: 30px;
      max-width: 400px;
    }

    .intro {
      font-size: 14px;
      margin-bottom: 10px;
    }

    .benefits-content h3 {
      font-size: 22px;
      margin-bottom: 20px;
    }

    .benefits-content ul {
      list-style: none;
      padding: 0;
    }

    .benefits-content li {
      font-size: 14px;
      margin-bottom: 12px;
      padding-left: 20px;
      position: relative;
    }

    .benefits-content li::before {
      content: '';
      width: 8px;
      height: 8px;
      background: white;
      position: absolute;
      left: 0;
      top: 6px;
      border-radius: 2px;
    }

    /* RIGHT PANEL */
    .form-panel {
      background: #f8fafc;
      padding: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }

    /* CARD */
    .register-card {
      width: 100%;
      max-width: 500px;
      background: white;
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
    }

    /* LOGIN TOP LINK - INSIDE CARD */
    .login-top-link {
      text-align: right;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e2e8f0;
    }

    .login-top-link p {
      margin: 0;
      font-size: 14px;
      color: #64748b;
    }

    .login-top-link a {
      color: #4f46e5;
      font-weight: 600;
      text-decoration: none;
    }

    .login-top-link a:hover {
      text-decoration: underline;
    }

    /* TITLE */
    .title-wrap {
      margin-bottom: 24px;
    }

    .title-wrap h1 {
      font-size: 28px;
      margin: 0;
      color: #1e293b;
    }

    .subtitle {
      font-size: 14px;
      color: #64748b;
      margin-top: 8px;
    }

    /* FORM */
    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .name-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    mat-form-field {
      width: 100%;
    }

    /* BUTTON */
    .submit-btn {
      background: linear-gradient(90deg, #4f46e5, #9333ea);
      color: white;
      border-radius: 10px;
      height: 48px;
      font-size: 15px;
      font-weight: 600;
    }

    .submit-btn:disabled {
      background: linear-gradient(90deg, #cbd5e1, #94a3b8);
    }

    /* TEXT */
    .legal-note {
      font-size: 12px;
      color: #64748b;
      text-align: center;
      margin-top: 16px;
    }

    .legal-note a {
      color: #4f46e5;
      text-decoration: none;
    }

    .error {
      color: red;
      font-size: 13px;
      text-align: center;
      margin: 0;
    }

    .marketing-optin {
      margin: 8px 0;
    }

    /* RESPONSIVE */
    @media (max-width: 900px) {
      .register-layout {
        grid-template-columns: 1fr;
        border-radius: 0;
      }

      .benefits-panel {
        padding: 30px;
      }

      .name-row {
        grid-template-columns: 1fr;
      }

      .register-card {
        padding: 24px;
      }
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
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      marketingOptIn: [false]
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

    const { firstName, lastName, email, password } = this.registerForm.getRawValue();

    this.authService.register(email, password, firstName, lastName).subscribe({
      next: () => {
        this.isLoading = false;
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