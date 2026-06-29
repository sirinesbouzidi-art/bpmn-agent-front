import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService, UserSummary } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-container">

        <!-- Header -->
        <header class="page-header">
          <div>
            <h1>Team management</h1>
            <p>Manage your team members and their access to the platform.</p>
          </div>
        </header>

        <!-- Stats cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon icon-purple">
              <mat-icon>group</mat-icon>
            </div>
            <div class="stat-body">
              <p class="stat-label">Total members</p>
              <p class="stat-value">{{ totalMembers() }}</p>
              <p class="stat-sub">Active team members</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon icon-green">
              <mat-icon>verified_user</mat-icon>
            </div>
            <div class="stat-body">
              <p class="stat-label">Administrators</p>
              <p class="stat-value">{{ adminCount() }}</p>
              <p class="stat-sub">Full access users</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon icon-blue">
              <mat-icon>person</mat-icon>
            </div>
            <div class="stat-body">
              <p class="stat-label">Users</p>
              <p class="stat-value">{{ userCount() }}</p>
              <p class="stat-sub">Standard access users</p>
            </div>
          </div>
        </div>

        <!-- Main grid: form+table on the left, side panels on the right -->
        <div class="main-grid">

          <div class="main-col">

            <!-- Add new member -->
            <div class="card create-card">
              <div class="card-header">
                <div class="card-header-icon">
                  <mat-icon>person_add</mat-icon>
                </div>
                <h2>Add new member</h2>
              </div>

              <form [formGroup]="createForm" (ngSubmit)="submitCreate()">
                <div class="form-row">
                  <div class="form-field">
                    <label>Email address <span class="required">*</span></label>
                    <mat-form-field appearance="outline">
                      <mat-icon matPrefix>mail_outline</mat-icon>
                      <input matInput type="email" formControlName="email" placeholder="Enter email address" />
                    </mat-form-field>
                  </div>

                  <div class="form-field">
                    <label>Password <span class="required">*</span></label>
                    <mat-form-field appearance="outline">
                      <mat-icon matPrefix>lock_outline</mat-icon>
                      <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" placeholder="Enter password" />
                      <button type="button" mat-icon-button matSuffix (click)="hidePassword = !hidePassword" tabindex="-1">
                        <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>

                  <div class="form-field">
                    <label>Role <span class="required">*</span></label>
                    <mat-form-field appearance="outline">
                      <mat-select formControlName="role" placeholder="Select a role">
                        <mat-option value="USER">User</mat-option>
                        <mat-option value="ADMIN">Administrator</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </div>

                <button
                  type="submit"
                  class="submit-btn"
                  [disabled]="createForm.invalid || isCreating()">
                  <mat-spinner diameter="18" *ngIf="isCreating()"></mat-spinner>
                  <ng-container *ngIf="!isCreating()">
                    <mat-icon>person_add</mat-icon>
                    Create account
                  </ng-container>
                </button>
              </form>
            </div>

            <!-- Team members table -->
            <div class="card list-card">
              <div class="list-header">
                <div class="card-header">
                  <div class="card-header-icon">
                    <mat-icon>group</mat-icon>
                  </div>
                  <h2>Team members</h2>
                </div>

                <div class="list-actions">
                  <div class="search-box">
                    <mat-icon>search</mat-icon>
                    <input type="text" placeholder="Search members..." [(ngModel)]="searchTerm" (ngModelChange)="onSearchChange()" [ngModelOptions]="{standalone: true}" />
                  </div>
                  <button class="refresh-btn" type="button" (click)="loadUsers()" [disabled]="isLoading()">
                    <mat-icon>refresh</mat-icon>
                    Refresh
                  </button>
                </div>
              </div>

              <div class="loading-row" *ngIf="isLoading()">
                <mat-spinner diameter="28"></mat-spinner>
              </div>

              <div class="table-wrapper" *ngIf="!isLoading()">
                <table class="members-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let user of pagedUsers()">
                      <td>
                        <div class="member-cell">
                          <span class="avatar" [ngClass]="user.role === 'ADMIN' ? 'avatar-admin' : 'avatar-user'">
                            {{ initials(user.email) }}
                          </span>
                          <span class="member-email">{{ user.email }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="role-badge" [class.role-admin]="user.role === 'ADMIN'">
                          {{ user.role === 'ADMIN' ? 'Administrator' : 'User' }}
                        </span>
                      </td>
                      <td>
                        <span class="status-badge" [class.status-active]="user.active" [class.status-inactive]="!user.active">
                          <span class="status-dot"></span>
                          {{ user.active ? 'Active' : 'Inactive' }}
                        </span>
                      </td>
                      <td class="joined-cell">{{ user.joinedAt | date:'MMM d, y' }}</td>
                      <td>
                        <div class="actions-cell">
                          <button
                            *ngIf="user.role !== 'ADMIN'"
                            class="icon-btn toggle-btn"
                            [matTooltip]="user.active ? 'Deactivate' : 'Activate'"
                            [disabled]="togglingEmail() === user.email"
                            (click)="toggleStatus(user)">
                            <mat-icon>{{ user.active ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                          </button>
                          <button
                            class="icon-btn delete-btn"
                            [disabled]="user.email === currentUserEmail() || deletingEmail() === user.email"
                            [matTooltip]="user.email === currentUserEmail() ? 'Cannot delete your own account' : 'Delete'"
                            (click)="confirmDelete(user)">
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p class="empty-state" *ngIf="filteredUsers().length === 0">
                  No team members found.
                </p>
              </div>

              <!-- Pagination -->
              <div class="table-footer" *ngIf="filteredUsers().length > 0">
                <p class="showing-text">
                  Showing {{ rangeStart() }} to {{ rangeEnd() }} of {{ filteredUsers().length }} members
                </p>
                <div class="pagination" *ngIf="totalPages() > 1">
                  <button class="page-btn nav-btn" [disabled]="currentPage() === 1" (click)="goToPage(currentPage() - 1)">
                    <mat-icon>chevron_left</mat-icon>
                  </button>
                  <button
                    *ngFor="let page of visiblePages()"
                    class="page-btn"
                    [class.active]="page === currentPage()"
                    [disabled]="page === -1"
                    [class.ellipsis]="page === -1"
                    (click)="page !== -1 && goToPage(page)">
                    {{ page === -1 ? '...' : page }}
                  </button>
                  <button class="page-btn nav-btn" [disabled]="currentPage() === totalPages()" (click)="goToPage(currentPage() + 1)">
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>

        <!-- Bottom panels -->
        <div class="bottom-grid">

          <div class="card overview-card">
            <h3>Team overview</h3>
            <div class="overview-total">
              <span class="overview-number">{{ totalMembers() }}</span>
              <span class="overview-label">Total</span>
            </div>
            <div class="overview-legend">
              <div class="legend-row">
                <span class="legend-dot dot-purple"></span>
                <span class="legend-name">Administrators</span>
                <span class="legend-value">{{ adminCount() }} ({{ adminPercent() }}%)</span>
              </div>
              <div class="legend-row">
                <span class="legend-dot dot-blue"></span>
                <span class="legend-name">Users</span>
                <span class="legend-value">{{ userCount() }} ({{ userPercent() }}%)</span>
              </div>
            </div>
          </div>

          <div class="card security-card">
            <div class="security-header">
              <mat-icon>shield</mat-icon>
              <h3>Security tips</h3>
            </div>
            <ul class="security-list">
              <li><mat-icon>check</mat-icon> Use strong passwords</li>
              <li><mat-icon>check</mat-icon> Review member access regularly</li>
              <li><mat-icon>check</mat-icon> Deactivate accounts that left the team</li>
              <li><mat-icon>check</mat-icon> Keep the number of admins minimal</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper {
      background: #f4f6fb;
      min-height: 100%;
      padding: 32px;
    }

    .page-container {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .page-header h1 {
      margin: 0 0 4px;
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
    }

    .page-header p {
      margin: 0;
      font-size: 14px;
      color: #64748b;
    }

    /* Stats grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .stat-card {
      background: #ffffff;
      border-radius: 16px;
      padding: 22px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .icon-purple { background: #eef0fa; }
    .icon-purple mat-icon { color: #4f46e5; }
    .icon-green { background: #dcfce7; }
    .icon-green mat-icon { color: #16a34a; }
    .icon-blue { background: #dbeafe; }
    .icon-blue mat-icon { color: #2563eb; }

    .stat-label {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }

    .stat-value {
      margin: 2px 0;
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
    }

    .stat-sub {
      margin: 0;
      font-size: 12px;
      color: #94a3b8;
    }

    /* Main grid */
    .main-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .bottom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .main-col {
      display: flex;
      flex-direction: column;
      gap: 24px;
      min-width: 0;
    }

    .card {
      background: #ffffff;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }

    .create-card {
      border-left: 4px solid #4f46e5;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .card-header-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #eef0fa;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-header-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #4f46e5;
    }

    .card-header h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
    }

    /* Form */
    .form-row {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 6px;
    }

    .form-field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 6px;
    }

    .required {
      color: #ef4444;
    }

    mat-form-field {
      width: 100%;
    }

    .submit-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 46px;
      padding: 0 24px;
      border: none;
      border-radius: 10px;
      background: linear-gradient(90deg, #4f46e5, #7c3aed);
      color: #ffffff;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      margin-top: 8px;
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .submit-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Table card */
    .list-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 8px;
    }

    .list-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0 12px;
      height: 40px;
      min-width: 200px;
    }

    .search-box mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
      color: #94a3b8;
    }

    .search-box input {
      border: none;
      outline: none;
      background: transparent;
      font-size: 13px;
      width: 100%;
    }

    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 40px;
      padding: 0 16px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #334155;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }

    .refresh-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .loading-row {
      display: flex;
      justify-content: center;
      padding: 40px 0;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .members-table {
      width: 100%;
      border-collapse: collapse;
    }

    .members-table thead th {
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      color: #94a3b8;
      padding: 12px 8px;
      border-bottom: 1px solid #e2e8f0;
    }

    .members-table tbody td {
      padding: 14px 8px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
      vertical-align: middle;
    }

    .members-table tbody tr:hover {
      background: #f8fafc;
    }

    .member-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .avatar-admin {
      background: #4f46e5;
      color: #ffffff;
    }

    .avatar-user {
      background: #dbeafe;
      color: #1e40af;
    }

    .member-email {
      font-weight: 500;
      color: #0f172a;
    }

    .role-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: #dbeafe;
      color: #1e40af;
    }

    .role-badge.role-admin {
      background: #eef0fa;
      color: #4f46e5;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .status-badge.status-active {
      background: #dcfce7;
      color: #166534;
    }
    .status-badge.status-active .status-dot {
      background: #22c55e;
    }

    .status-badge.status-inactive {
      background: #fee2e2;
      color: #991b1b;
    }
    .status-badge.status-inactive .status-dot {
      background: #ef4444;
    }

    .joined-cell {
      color: #64748b;
    }

    .actions-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .icon-btn {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: none;
      background: #f8fafc;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .icon-btn:hover:not(:disabled) {
      background: #eef0fa;
    }

    .icon-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .icon-btn.toggle-btn mat-icon {
      color: #4f46e5;
    }

    .icon-btn.delete-btn {
      color: #ef4444;
      background: #fef2f2;
    }

    .icon-btn.delete-btn:hover:not(:disabled) {
      background: #fee2e2;
    }

    .empty-state {
      text-align: center;
      color: #94a3b8;
      padding: 32px 0;
      font-size: 14px;
    }

    .table-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
    }

    .showing-text {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }

    .pagination {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .page-btn {
      min-width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #334155;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .page-btn.active {
      background: #4f46e5;
      border-color: #4f46e5;
      color: #ffffff;
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .page-btn.ellipsis {
      border: none;
      cursor: default;
    }

    /* Side panels */
    .overview-card h3,
    .security-card h3 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .overview-total {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 20px;
    }

    .overview-number {
      font-size: 36px;
      font-weight: 800;
      color: #4f46e5;
    }

    .overview-label {
      font-size: 13px;
      color: #94a3b8;
    }

    .overview-legend {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .legend-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #334155;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .dot-purple { background: #4f46e5; }
    .dot-blue { background: #2563eb; }

    .legend-name {
      flex: 1;
    }

    .legend-value {
      font-weight: 600;
      color: #0f172a;
    }

    .security-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }

    .security-header mat-icon {
      color: #4f46e5;
    }

    .security-header h3 {
      margin: 0;
    }

    .security-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .security-list li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 13px;
      color: #475569;
      line-height: 1.4;
    }

    .security-list mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #16a34a;
      margin-top: 1px;
      flex-shrink: 0;
    }

    @media (max-width: 1100px) {
      .main-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 700px) {
      .page-wrapper {
        padding: 16px;
      }

      .bottom-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .list-header {
        flex-direction: column;
        align-items: stretch;
      }

      .list-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .search-box {
        min-width: 0;
      }
    }
  `]
})
export class AdminComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly users = signal<UserSummary[]>([]);
  readonly isLoading = signal(false);
  readonly isCreating = signal(false);
  readonly deletingEmail = signal<string | null>(null);
  readonly togglingEmail = signal<string | null>(null);
  hidePassword = true;

  searchTerm = '';
  private readonly searchSignal = signal('');
  private readonly currentPageSignal = signal(1);
  readonly pageSize = 8;

  readonly createForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['USER' as 'USER' | 'ADMIN', [Validators.required]]
  });

  readonly totalMembers = computed(() => this.users().length);
  readonly adminCount = computed(() => this.users().filter(u => u.role === 'ADMIN').length);
  readonly userCount = computed(() => this.users().filter(u => u.role === 'USER').length);

  readonly adminPercent = computed(() => {
    const total = this.totalMembers();
    return total === 0 ? 0 : Math.round((this.adminCount() / total) * 100);
  });

  readonly userPercent = computed(() => {
    const total = this.totalMembers();
    return total === 0 ? 0 : Math.round((this.userCount() / total) * 100);
  });

  readonly filteredUsers = computed(() => {
    const term = this.searchSignal().trim().toLowerCase();
    if (!term) return this.users();
    return this.users().filter(u => u.email.toLowerCase().includes(term));
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize))
  );

  readonly currentPage = computed(() => {
    const page = this.currentPageSignal();
    return Math.min(page, this.totalPages());
  });

  readonly pagedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredUsers().slice(start, start + this.pageSize);
  });

  readonly rangeStart = computed(() =>
    this.filteredUsers().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1
  );

  readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.filteredUsers().length)
  );

  constructor() {
    this.loadUsers();
  }

  currentUserEmail(): string | undefined {
    return this.authService.currentUser()?.email;
  }

  initials(email: string): string {
    return email.slice(0, 2).toUpperCase();
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
        this.snackBar.open('Unable to load team members.', 'Close', { duration: 4000 });
      }
    });
  }

  onSearchChange(): void {
    this.searchSignal.set(this.searchTerm);
    this.currentPageSignal.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPageSignal.set(page);
  }

  visiblePages(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (current > 3) pages.push(-1);

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 2) pages.push(-1);
    pages.push(total);

    return pages;
  }

  submitCreate(): void {
    if (this.createForm.invalid) return;

    this.isCreating.set(true);
    const { email, password, role } = this.createForm.getRawValue();

    this.authService.createUser({ email, password, role }).subscribe({
      next: () => {
        this.isCreating.set(false);
        this.createForm.reset({ email: '', password: '', role: 'USER' });
        this.snackBar.open(`Account created for ${email}.`, 'Close', { duration: 3000 });
        this.loadUsers();
      },
      error: (err) => {
        this.isCreating.set(false);
        const message = err.error?.message || 'Error creating account.';
        this.snackBar.open(message, 'Close', { duration: 4000 });
      }
    });
  }

  toggleStatus(user: UserSummary): void {
    this.togglingEmail.set(user.email);
    const nextActive = !user.active;

    this.authService.toggleUserStatus(user.email, nextActive).subscribe({
      next: () => {
        this.togglingEmail.set(null);
        this.snackBar.open(
          `${user.email} ${nextActive ? 'activated' : 'deactivated'}.`,
          'Close',
          { duration: 3000 }
        );
        this.loadUsers();
      },
      error: (err) => {
        this.togglingEmail.set(null);
        const message = err.error?.message || 'Error updating status.';
        this.snackBar.open(message, 'Close', { duration: 4000 });
      }
    });
  }

  confirmDelete(user: UserSummary): void {
    const confirmed = window.confirm(
      `Delete the account for ${user.email}? This action is irreversible.`
    );
    if (!confirmed) return;

    this.deletingEmail.set(user.email);
    this.authService.deleteUser(user.email).subscribe({
      next: () => {
        this.deletingEmail.set(null);
        this.snackBar.open(`Account ${user.email} deleted.`, 'Close', { duration: 3000 });
        this.loadUsers();
      },
      error: () => {
        this.deletingEmail.set(null);
        this.snackBar.open('Error deleting account.', 'Close', { duration: 4000 });
      }
    });
  }
}