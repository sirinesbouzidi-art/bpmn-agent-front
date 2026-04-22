import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
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
    MatTableModule, 
    MatButtonModule, 
    MatIconModule, 
    MatSnackBarModule,
    EmptyStateComponent
  ],
  template: `
    <div class="page-container">
      <div class="content-card history-card">
        <div class="history-header">
          <h2>Generated BPMN history</h2>
          <button *ngIf="models.length > 0" mat-stroked-button color="warn" (click)="clearHistory()">
            <mat-icon>delete_sweep</mat-icon>
            Clear all
          </button>
        </div>

        <app-empty-state
          *ngIf="models.length === 0"
          title="No BPMN model yet"
          description="Generate your first process from the home page."
        />

        <div class="table-container" *ngIf="models.length > 0">
          <table mat-table [dataSource]="models" class="history-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let model">{{ model.name }}</td>
            </ng-container>

            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Description</th>
              <td mat-cell *matCellDef="let model">
                <div class="description-cell">{{ truncateDescription(model.description) }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let model">{{ model.createdAt | date:'medium' }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let model">
                <span class="status-chip" [class.generated]="model.status === 'Generated'">{{ model.status }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let model" class="actions-cell">
                <button mat-icon-button color="primary" (click)="view(model)" title="View">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button (click)="exportXml(model)" title="Export XML">
                  <mat-icon>description</mat-icon>
                </button>
                <button mat-icon-button (click)="exportSvg(model)" title="Export SVG">
                  <mat-icon>image</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteModel(model.id)" title="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .history-card { padding: 28px; }
    .history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .history-header h2 { margin: 0; font-size: 28px; font-weight: 600; background: linear-gradient(135deg, #1e293b, #4f46e5); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .table-container { overflow-x: auto; border-radius: 16px; background: white; }
    .history-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    th.mat-mdc-header-cell { font-size: 13px; font-weight: 600; color: #5f6d8a; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
    td.mat-mdc-cell { border-bottom: 1px solid #f1f5f9; padding: 16px 12px; }
    tr.mat-mdc-row:hover { background: #f8fafc; }
    .description-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .status-chip { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #e2e8f0; color: #475569; }
    .status-chip.generated { background: #dbeafe; color: #1e40af; }
    .actions-cell { display: flex; align-items: center; gap: 8px; }
    .actions-cell button { transition: transform 0.2s; }
    .actions-cell button:hover { transform: translateY(-2px); }
  `]
})
export class HistoryComponent implements OnInit, OnDestroy {
  private readonly historyService = inject(HistoryService);
  private readonly bpmnService = inject(BpmnService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  models: BpmnModel[] = [];
  private historySubscription?: Subscription;
  readonly displayedColumns: string[] = ['name', 'description', 'createdAt', 'status', 'actions'];

  ngOnInit(): void {
    this.models = this.historyService.getHistory();
    this.historySubscription = this.historyService.history$.subscribe(history => {
      this.models = history;
    });
  }

  ngOnDestroy(): void {
    this.historySubscription?.unsubscribe();
  }

  truncateDescription(description: string, maxLength: number = 80): string {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  }

  view(model: BpmnModel): void {
    this.bpmnService.setCurrentModel(model);
    this.router.navigate(['/home']);
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