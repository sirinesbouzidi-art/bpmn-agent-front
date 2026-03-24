import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BpmnService } from '../../core/services/bpmn.service';
import { HistoryService } from '../../core/services/history.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { BpmnModel } from '../../shared/models/bpmn.model';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, EmptyStateComponent],
  template: `
    <div class="page-container">
      <div class="content-card history-card">
        <h2>Generated BPMN history</h2>

        <app-empty-state
          *ngIf="models.length === 0"
          title="No BPMN model yet"
          description="Generate your first process from the home page."
        />

        <table mat-table [dataSource]="models" *ngIf="models.length > 0" class="history-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let model">{{ model.name }}</td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Description</th>
            <td mat-cell *matCellDef="let model">{{ model.description }}</td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let model">{{ model.createdAt | date }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
             <td mat-cell *matCellDef="let model"><span class="status-chip">{{ model.status }}</span></td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let model" class="actions-cell">
              <button mat-icon-button color="primary" (click)="view(model)">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button (click)="exportXml(model)">
                <mat-icon>description</mat-icon>
              </button>
              <button mat-icon-button (click)="exportSvg(model)">
                <mat-icon>image</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
       .history-card h2 {
         margin-top: 0;
         font-size: 36px;
      }
      .history-table {
        width: 100%;
         border-collapse: separate;
        border-spacing: 0;
        overflow: hidden;
        border-radius: 16px;
      }

      th.mat-mdc-header-cell {
        font-size: 13px;
        letter-spacing: 0.3px;
        color: #5f6d8a;
        background: #f6f9ff;
      }

      td.mat-mdc-cell,
      th.mat-mdc-header-cell {
        border-color: #e2e9f7;
        padding: 14px 12px;
      }

      tr.mat-mdc-row:hover {
        background: #f8fbff;
      }

      .status-chip {
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        color: #4f46e5;
        background: #eceeff;
      }

      .actions-cell {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .actions-cell button {
        border-radius: 10px;
        border: 1px solid #dce4f5;
        background: #fff;
      }
    `
  ]
})
export class HistoryComponent {
  private readonly historyService = inject(HistoryService);
  private readonly bpmnService = inject(BpmnService);
  private readonly router = inject(Router);

  readonly models: BpmnModel[] = this.historyService.getHistory();
  readonly displayedColumns: string[] = ['name', 'description', 'createdAt', 'status', 'actions'];

  view(model: BpmnModel): void {
    this.bpmnService.setCurrentModel(model);
    this.router.navigate(['/viewer']);
  }

  exportXml(model: BpmnModel): void {
    this.bpmnService.downloadXml(model);
  }

  exportSvg(model: BpmnModel): void {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160">
      <rect x="10" y="10" width="380" height="140" rx="14" fill="#f6f8fc" stroke="#0b2a5b"/>
      <text x="30" y="60" font-size="20" fill="#0b2a5b">${model.name}</text>
      <text x="30" y="95" font-size="14" fill="#334155">Status: ${model.status}</text>
    </svg>`;
    this.bpmnService.downloadSvg(svg, model.name);
  }
}
