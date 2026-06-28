import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { BpmnService } from '../../core/services/bpmn.service';
import { HistoryService } from '../../core/services/history.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { BpmnModel } from '../../shared/models/bpmn.model';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    EmptyStateComponent
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-container">

        <!-- Header -->
        <div class="history-toolbar">
          <div class="toolbar-left">
            <div class="header-icon">
              <mat-icon>history</mat-icon>
            </div>
            <div>
              <h1>Generated BPMN history</h1>
              <p>Browse and manage all your generated BPMN diagrams.</p>
            </div>
          </div>

          <div class="toolbar-right">
            <div class="search-box">
              <mat-icon>search</mat-icon>
              <input
                type="text"
                placeholder="Search by name or description..."
                [(ngModel)]="searchTerm"
                (ngModelChange)="onSearchChange()"
              />
            </div>
            <button class="filters-btn" type="button">
              <mat-icon>filter_list</mat-icon>
              Filters
            </button>
            <button class="clear-btn" type="button" *ngIf="models.length > 0" (click)="clearHistory()">
              <mat-icon>delete_sweep</mat-icon>
              Clear all
            </button>
          </div>
        </div>

        <!-- Content card -->
        <div class="content-card">

          <app-empty-state
            *ngIf="models.length === 0"
            title="No BPMN model yet"
            description="Generate your first process from the home page."
          />

          <ng-container *ngIf="models.length > 0">
            <table class="history-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let model of pagedModels(); let i = index">
                  <td>
                    <div class="name-cell">
                      <div class="row-icon" [ngClass]="iconColorClass(i)">
                        <mat-icon>hub</mat-icon>
                      </div>
                      <span class="model-name">{{ model.name }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="description-cell">{{ truncateDescription(model.description) }}</div>
                  </td>
                  <td>
                    <div class="date-cell">
                      <div class="date-line">
                        <mat-icon>calendar_today</mat-icon>
                        {{ model.date | date:'MMM d, y' }}
                      </div>
                      <div class="time-line">
                        <mat-icon>schedule</mat-icon>
                        {{ model.date | date:'h:mm a' }}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="status-chip" [ngClass]="statusClass(model.status)">
                      <span class="status-dot"></span>
                      {{ model.status }}
                    </span>
                  </td>
                  <td>
                    <div class="actions-cell">
                      <button class="action-btn view-btn" (click)="view(model)" title="View">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button class="action-btn" (click)="exportXml(model)" title="Export XML">
                        <mat-icon>description</mat-icon>
                      </button>
                      <button class="action-btn" (click)="exportSvg(model)" title="Export SVG">
                        <mat-icon>image</mat-icon>
                      </button>
                      <button class="action-btn delete-btn" (click)="deleteModel(model.id)" title="Delete">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </ng-container>

          <!-- Footer stats + pagination -->
          <div class="stats-footer" *ngIf="models.length > 0">
            <div class="stats-left">
              <div class="stat-icon">
                <mat-icon>bar_chart</mat-icon>
              </div>
              <div class="stat-block">
                <span class="stat-label">Total diagrams</span>
                <span class="stat-value">{{ totalDiagrams() }}</span>
              </div>
              <div class="stat-block">
                <span class="stat-label">This month</span>
                <span class="stat-value">{{ thisMonthCount() }}</span>
              </div>
              <div class="stat-block">
                <span class="stat-label">Success rate</span>
                <span class="stat-value success">{{ successRate() }}%</span>
              </div>
            </div>

            <div class="pagination" *ngIf="totalPages() > 1">
              <button
                class="page-btn nav-btn"
                [disabled]="currentPage() === 1"
                (click)="goToPage(currentPage() - 1)"
              >
                <mat-icon>chevron_left</mat-icon>
              </button>

              <button
                *ngFor="let page of visiblePages()"
                class="page-btn"
                [class.active]="page === currentPage()"
                [class.ellipsis]="page === -1"
                [disabled]="page === -1"
                (click)="page !== -1 && goToPage(page)"
              >
                {{ page === -1 ? '...' : page }}
              </button>

              <button
                class="page-btn nav-btn"
                [disabled]="currentPage() === totalPages()"
                (click)="goToPage(currentPage() + 1)"
              >
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper {
      background: #f4f6fb;
      min-height: calc(100vh - 64px);
      padding: 32px 24px 64px;
      display: flex;
      justify-content: center;
    }

    .page-container {
      max-width: 1400px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .history-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      background: #eef0fa;
      border-radius: 16px;
      padding: 20px 24px;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .header-icon mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
      color: #4f46e5;
    }

    .toolbar-left h1 {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
    }

    .toolbar-left p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border-radius: 10px;
      padding: 0 14px;
      height: 44px;
      min-width: 280px;
    }

    .search-box mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #94a3b8;
    }

    .search-box input {
      border: none;
      outline: none;
      font-size: 14px;
      width: 100%;
      background: transparent;
    }

    .filters-btn,
    .clear-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 44px;
      padding: 0 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
    }

    .filters-btn {
      background: #ffffff;
      color: #334155;
    }

    .filters-btn mat-icon,
    .clear-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .clear-btn {
      background: linear-gradient(90deg, #4f46e5, #7c3aed);
      color: #ffffff;
    }

    .content-card {
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }

    .history-table {
      width: 100%;
      border-collapse: collapse;
    }

    .history-table thead th {
      text-align: left;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.4px;
      color: #64748b;
      background: #f8fafc;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      text-transform: uppercase;
    }

    .history-table tbody td {
      padding: 18px 20px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      font-size: 14px;
    }

    .history-table tbody tr:hover {
      background: #f8fafc;
    }

    .name-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .row-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .row-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .row-icon.color-purple {
      background: #eef0fa;
    }
    .row-icon.color-purple mat-icon {
      color: #4f46e5;
    }

    .row-icon.color-blue {
      background: #e0f0fe;
    }
    .row-icon.color-blue mat-icon {
      color: #2563eb;
    }

    .row-icon.color-orange {
      background: #fef3e2;
    }
    .row-icon.color-orange mat-icon {
      color: #d97706;
    }

    .model-name {
      font-weight: 600;
      color: #0f172a;
    }

    .description-cell {
      max-width: 320px;
      color: #475569;
    }

    .date-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: #475569;
    }

    .date-line,
    .time-line {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }

    .date-line mat-icon,
    .time-line mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #94a3b8;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .status-chip.status-validated {
      background: #dcfce7;
      color: #166534;
    }
    .status-chip.status-validated .status-dot {
      background: #22c55e;
    }

    .status-chip.status-generated {
      background: #dbeafe;
      color: #1e40af;
    }
    .status-chip.status-generated .status-dot {
      background: #3b82f6;
    }

    .status-chip.status-draft {
      background: #fef3e2;
      color: #b45309;
    }
    .status-chip.status-draft .status-dot {
      background: #f59e0b;
    }

    .actions-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .action-btn {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: none;
      background: #f8fafc;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.15s ease;
    }

    .action-btn mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
    }

    .action-btn:hover {
      transform: translateY(-2px);
      background: #eef0fa;
    }

    .action-btn.view-btn {
      color: #4f46e5;
      background: #eef0fa;
    }

    .action-btn.delete-btn {
      color: #ef4444;
      background: #fef2f2;
    }

    .action-btn.delete-btn:hover {
      background: #fee2e2;
    }

    .stats-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding: 20px 24px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    .stats-left {
      display: flex;
      align-items: center;
      gap: 28px;
      flex-wrap: wrap;
    }

    .stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #eef0fa;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #4f46e5;
    }

    .stat-block {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 12px;
      color: #64748b;
    }

    .stat-value {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
    }

    .stat-value.success {
      color: #16a34a;
    }

    .pagination {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .page-btn {
      min-width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #334155;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .page-btn:hover:not(:disabled):not(.active) {
      background: #f1f5f9;
    }

    .page-btn.active {
      background: #4f46e5;
      border-color: #4f46e5;
      color: #ffffff;
    }

    .page-btn.ellipsis {
      border: none;
      cursor: default;
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .page-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    @media (max-width: 900px) {
      .history-toolbar {
        flex-direction: column;
        align-items: stretch;
      }

      .toolbar-right {
        flex-direction: column;
        align-items: stretch;
      }

      .search-box {
        min-width: 0;
      }

      .stats-footer {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class HistoryComponent implements OnInit, OnDestroy {
  private readonly historyService = inject(HistoryService);
  private readonly bpmnService = inject(BpmnService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  models: BpmnModel[] = [];
  private historySubscription?: Subscription;

  searchTerm = '';
  private readonly searchSignal = signal('');
  private readonly currentPageSignal = signal(1);
  readonly pageSize = 10;

  readonly filteredModels = computed(() => {
    const term = this.searchSignal().trim().toLowerCase();
    if (!term) return this.models;
    return this.models.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        (m.description ?? '').toLowerCase().includes(term)
    );
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredModels().length / this.pageSize))
  );

  readonly currentPage = computed(() => {
    const page = this.currentPageSignal();
    const max = this.totalPages();
    return Math.min(page, max);
  });

  readonly pagedModels = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredModels().slice(start, start + this.pageSize);
  });

  readonly totalDiagrams = computed(() => this.models.length);

  readonly thisMonthCount = computed(() => {
    const now = new Date();
    return this.models.filter((m) => {
      const d = new Date(m.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  });

  readonly successRate = computed(() => {
    if (this.models.length === 0) return 0;
    const validated = this.models.filter(
      (m) => m.status === 'Validated' || m.status === 'Generated'
    ).length;
    return Math.round((validated / this.models.length) * 100);
  });

  ngOnInit(): void {
    this.models = this.historyService.getHistory();
    this.historySubscription = this.historyService.history$.subscribe(history => {
      this.models = history;
      this.currentPageSignal.set(1);
    });
  }

  ngOnDestroy(): void {
    this.historySubscription?.unsubscribe();
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

  iconColorClass(index: number): string {
    const colors = ['color-purple', 'color-blue', 'color-orange'];
    return colors[index % colors.length];
  }

  statusClass(status: string): string {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'validated') return 'status-validated';
    if (normalized === 'draft') return 'status-draft';
    return 'status-generated';
  }

  truncateDescription(description: string, maxLength: number = 60): string {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  }

  view(model: BpmnModel): void {
    this.bpmnService.setCurrentModel({
      ...model,
      xml: model.xml
    });
    this.router.navigate(['/viewer']);
    this.snackBar.open('Opening diagram...', 'Close', { duration: 2000 });
  }

  exportXml(model: BpmnModel): void {
    this.bpmnService.downloadXml(model);
    this.snackBar.open('XML exported', 'Close', { duration: 2000 });
  }

  exportSvg(model: BpmnModel): void {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160">
      <rect x="10" y="10" width="380" height="140" rx="14" fill="#f6f8fc" stroke="#4f46e5"/>
      <text x="30" y="60" font-size="20" fill="#1e293b">${model.name}</text>
      <text x="30" y="95" font-size="14" fill="#64748b">Status: ${model.status}</text>
    </svg>`;
    this.bpmnService.downloadSvg(svg, model.name);
    this.snackBar.open('SVG exported', 'Close', { duration: 2000 });
  }

  deleteModel(id: string): void {
    if (confirm('Delete this model?')) {
      this.historyService.removeFromHistory(id);
      this.snackBar.open('Model deleted', 'Close', { duration: 2000 });
    }
  }

  clearHistory(): void {
    if (confirm('Delete ALL models?')) {
      this.historyService.clearHistory();
      this.snackBar.open('All models deleted', 'Close', { duration: 2000 });
    }
  }
}