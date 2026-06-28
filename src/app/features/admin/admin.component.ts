import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService, UserSummary } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-container">

        <header class="page-header">
          <div class="header-icon">
            <mat-icon>admin_panel_settings</mat-icon>
          </div>
          <div>
            <h1>Gestion des utilisateurs</h1>
            <p>Créez ou supprimez les comptes de l'équipe.</p>
          </div>
        </header>

        <!-- Formulaire de création -->
        <mat-card class="create-card">
          <h2 class="card-title">Ajouter un membre</h2>

          <form [formGroup]="createForm" (ngSubmit)="submitCreate()">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" placeholder="prenom.nom@bouygues.com" />
                <mat-error *ngIf="createForm.get('email')?.hasError('required')">
                  L'email est requis
                </mat-error>
                <mat-error *ngIf="createForm.get('email')?.hasError('email')">
                  Format d'email invalide
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Mot de passe</mat-label>
                <input matInput type="password" formControlName="password" />
                <mat-error *ngIf="createForm.get('password')?.hasError('required')">
                  Le mot de passe est requis
                </mat-error>
                <mat-error *ngIf="createForm.get('password')?.hasError('minlength')">
                  6 caractères minimum
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Rôle</mat-label>
                <mat-select formControlName="role">
                  <mat-option value="USER">Utilisateur</mat-option>
                  <mat-option value="ADMIN">Administrateur</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <button
              mat-flat-button
              class="submit-btn"
              type="submit"
              [disabled]="createForm.invalid || isCreating()">
              <mat-spinner diameter="20" *ngIf="isCreating()"></mat-spinner>
              <span *ngIf="!isCreating()">
                <mat-icon>person_add</mat-icon>
                Créer le compte
              </span>
            </button>
          </form>
        </mat-card>

        <!-- Liste des utilisateurs -->
        <mat-card class="list-card">
          <div class="list-header">
            <h2 class="card-title">Membres de l'équipe</h2>
            <button mat-stroked-button (click)="loadUsers()" [disabled]="isLoading()">
              <mat-icon>refresh</mat-icon>
              Actualiser
            </button>
          </div>

          <div class="loading-row" *ngIf="isLoading()">
            <mat-spinner diameter="28"></mat-spinner>
          </div>

          <table mat-table [dataSource]="users()" *ngIf="!isLoading()" class="users-table">

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let user">{{ user.email }}</td>
            </ng-container>

            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef>Rôle</th>
              <td mat-cell *matCellDef="let user">
                <span class="role-chip" [class.role-admin]="user.role === 'ADMIN'">
                  {{ user.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let user">
                <button
                  mat-icon-button
                  color="warn"
                  [disabled]="user.email === currentUserEmail() || deletingEmail() === user.email"
                  [matTooltip]="user.email === currentUserEmail() ? 'Impossible de supprimer votre propre compte' : 'Supprimer'"
                  (click)="confirmDelete(user)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <p class="empty-state" *ngIf="!isLoading() && users().length === 0">
            Aucun utilisateur trouvé.
          </p>
        </mat-card>

      </div>
    </div>
  `,
  styles: [
    `
      .page-wrapper {
        background: #f4f6fb;
        min-height: calc(100vh - 64px);
        padding: 32px 24px 64px;
        display: flex;
        justify-content: center;
      }

      .page-container {
        max-width: 980px;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .page-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 8px;
      }

      .header-icon {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        background: #eef1fc;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .header-icon mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
        color: #1a1a4d;
      }

      .page-header h1 {
        margin: 0 0 4px;
        font-size: 24px;
        font-weight: 700;
        color: #0b1f4b;
      }

      .page-header p {
        margin: 0;
        font-size: 14px;
        color: #6b7280;
      }

      mat-card {
        border-radius: 16px !important;
        padding: 28px !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06) !important;
      }

      .card-title {
        margin: 0 0 20px;
        font-size: 17px;
        font-weight: 600;
        color: #0b1f4b;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1.4fr 1fr 1fr;
        gap: 16px;
        margin-bottom: 8px;
      }

      mat-form-field {
        width: 100%;
      }

      .submit-btn {
        background: linear-gradient(90deg, #1a1a4d, #2d1b69);
        color: #ffffff;
        border-radius: 10px;
        height: 46px;
        font-weight: 600;
        font-size: 14px;
        padding: 0 24px;
      }

      .submit-btn mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 6px;
        vertical-align: middle;
      }

      .submit-btn:disabled {
        background: linear-gradient(90deg, #cbd5e1, #94a3b8);
      }

      .list-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
      }

      .list-header .card-title {
        margin-bottom: 0;
      }

      .loading-row {
        display: flex;
        justify-content: center;
        padding: 40px 0;
      }

      .users-table {
        width: 100%;
        margin-top: 12px;
        background: transparent;
      }

      .role-chip {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 999px;
        background: #eef0fa;
        color: #1a1a4d;
        font-size: 12px;
        font-weight: 600;
      }

      .role-chip.role-admin {
        background: #fef3e2;
        color: #d97706;
      }

      .empty-state {
        text-align: center;
        color: #9ca3af;
        padding: 24px 0;
        font-size: 14px;
      }

      @media (max-width: 700px) {
        .form-row {
          grid-template-columns: 1fr;
        }

        .page-wrapper {
          padding: 24px 16px 48px;
        }
      }
    `
  ]
})
export class AdminComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly displayedColumns = ['email', 'role', 'actions'];

  readonly users = signal<UserSummary[]>([]);
  readonly isLoading = signal(false);
  readonly isCreating = signal(false);
  readonly deletingEmail = signal<string | null>(null);

  readonly createForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['USER' as 'USER' | 'ADMIN', [Validators.required]]
  });

  constructor() {
    this.loadUsers();
  }

  currentUserEmail(): string | undefined {
    return this.authService.currentUser()?.email;
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.authService.listUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Impossible de charger la liste des utilisateurs.', 'Fermer', { duration: 4000 });
      }
    });
  }

  submitCreate(): void {
    if (this.createForm.invalid) return;

    this.isCreating.set(true);
    const { email, password, role } = this.createForm.getRawValue();

    this.authService.createUser({ email, password, role }).subscribe({
      next: () => {
        this.isCreating.set(false);
        this.createForm.reset({ email: '', password: '', role: 'USER' });
        this.snackBar.open(`Compte créé pour ${email}.`, 'Fermer', { duration: 3000 });
        this.loadUsers();
      },
      error: (err) => {
        this.isCreating.set(false);
        const message = err.error?.message || 'Erreur lors de la création du compte.';
        this.snackBar.open(message, 'Fermer', { duration: 4000 });
      }
    });
  }

  confirmDelete(user: UserSummary): void {
    const confirmed = window.confirm(
      `Supprimer le compte de ${user.email} ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    this.deletingEmail.set(user.email);
    this.authService.deleteUser(user.email).subscribe({
      next: () => {
        this.deletingEmail.set(null);
        this.snackBar.open(`Compte ${user.email} supprimé.`, 'Fermer', { duration: 3000 });
        this.loadUsers();
      },
      error: () => {
        this.deletingEmail.set(null);
        this.snackBar.open('Erreur lors de la suppression.', 'Fermer', { duration: 4000 });
      }
    });
  }
}