import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import BpmnJS from 'bpmn-js/lib/NavigatedViewer';
import { finalize } from 'rxjs';
import { BpmnService } from '../../core/services/bpmn.service';

@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container" *ngIf="model() as currentModel">
      <div class="viewer-grid">
        <mat-card class="content-card">
          <div class="actions">
            <button mat-icon-button (click)="zoomIn()" aria-label="Zoom in"><mat-icon>zoom_in</mat-icon></button>
            <button mat-icon-button (click)="zoomOut()" aria-label="Zoom out"><mat-icon>zoom_out</mat-icon></button>
            <button mat-icon-button (click)="resetZoom()" aria-label="Reset zoom"><mat-icon>center_focus_strong</mat-icon></button>
            <span class="divider"></span>
            <button mat-stroked-button (click)="exportXml()">Download XML</button>
            <button mat-stroked-button (click)="exportSvg()">Download SVG</button>
            <button mat-flat-button color="primary" (click)="deployProcess()" [disabled]="isDeploying">
              {{ isDeploying ? 'Deploying...' : 'Deploy BPMN' }}
            </button>
            <button mat-button type="button" (click)="openCamundaManually()">Open Camunda Manually</button>
          </div>

          <div class="deploy-status" *ngIf="deployMessage">
            <mat-spinner *ngIf="isDeploying" diameter="18"></mat-spinner>
            <span [class.error]="deployError">{{ deployMessage }}</span>
          </div>
          <div #canvas class="canvas"></div>
        </mat-card>

        <mat-card class="content-card info-card">
          <h3>Model Info</h3>
          <p><strong>Name:</strong> {{ currentModel.name }}</p>
          <p><strong>Description:</strong> {{ currentModel.description }}</p>
          <p><strong>Creation date:</strong> {{ currentModel.createdAt | date: 'medium' }}</p>
          <p><strong>Status:</strong> {{ currentModel.status }}</p>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .viewer-grid {
        display: grid;
       grid-template-columns: minmax(0, 2.2fr) minmax(320px, 1fr);
        gap: 18px;
      }

      .canvas {
        min-height: 560px;
        border: 1px solid #dce4f5;
        border-radius: 16px;
        background: linear-gradient(180deg, #ffffff, #f8faff);
      }

      .actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
         margin-bottom: 14px;
      }

      .actions button[mat-icon-button] {
        border-radius: 12px;
        border: 1px solid #dbe4f8;
        background: #f8faff;
      }

      .actions button[mat-stroked-button] {
        border-radius: 12px;
        border-color: #cad8fb;
        color: #3b4f75;
      }

      .actions button[mat-flat-button] {
        border-radius: 12px;
      }

      .deploy-status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        color: #1f2a44;
      }

      .deploy-status .error {
        color: #c62828;
      }

      .divider {
        width: 1px;
        height: 24px;
        background: #d7deea;
      }
         .info-card {
        align-self: start;
      }

      h3 {
        margin-top: 0;
        font-size: 30px;
      }

      p {
        color: #53617f;
        margin: 0 0 12px;
      }

      strong {
        color: #1f2a44;
      }


      @media (max-width: 992px) {
        .viewer-grid {
          grid-template-columns: 1fr;
        }
          .canvas {
          min-height: 440px;
        }
      }
    `
  ]
})
export class ViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef?: ElementRef<HTMLDivElement>;

  private readonly bpmnService = inject(BpmnService);
  private readonly router = inject(Router);

  readonly model = signal(this.bpmnService.currentModel());

  isDeploying = false;
  deployError = false;
  deployMessage = '';

  private viewer?: BpmnJS;

  async ngAfterViewInit(): Promise<void> {
    if (!this.model()) {
      this.router.navigate(['/home']);
      return;
    }

    if (!this.canvasRef) {
      return;
    }

    this.viewer = new BpmnJS({ container: this.canvasRef.nativeElement });
    await this.viewer.importXML(this.model()!.xml);
    this.resetZoom();
  }

  zoomIn(): void {
    this.applyZoom(0.2);
  }

  zoomOut(): void {
    this.applyZoom(-0.2);
  }

  resetZoom(): void {
    const canvas = this.viewer?.get('canvas') as { zoom: (mode: 'fit-viewport') => void };
    canvas?.zoom('fit-viewport');
  }

  exportXml(): void {
    const currentModel = this.model();
    if (!currentModel) {
      return;
    }
    this.bpmnService.downloadXml(currentModel);
  }

  async exportSvg(): Promise<void> {
    const currentModel = this.model();
    if (!currentModel || !this.viewer) {
      return;
    }

    const result = (await this.viewer.saveSVG()) as { svg: string };
    this.bpmnService.downloadSvg(result.svg, currentModel.name);
  }

  deployProcess(): void {
    const currentModel = this.model();
    if (!currentModel || this.isDeploying) {
      return;
    }

    this.isDeploying = true;
    this.deployError = false;
    this.deployMessage = 'Deploying process...';

    this.bpmnService
      .deployXml(currentModel.xml)
      .pipe(finalize(() => (this.isDeploying = false)))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.deployError = true;
            this.deployMessage = response.message || 'Deployment failed.';
            return;
          }

          this.deployMessage = 'Process deployed successfully. Opening Camunda Operate...';

          setTimeout(() => {
            window.open('http://localhost:8081', '_blank');
          }, 1000);
        },
        error: () => {
          this.deployError = true;
          this.deployMessage = 'Deployment failed. Please verify your BPMN XML and try again.';
        }
      });
  }

  openCamundaManually(): void {
    window.open('http://localhost:8081', '_blank');
  }

  ngOnDestroy(): void {
    this.viewer?.destroy();
  }

  private applyZoom(delta: number): void {
    const canvas = this.viewer?.get('canvas') as {
      zoom: (newScale?: number | 'fit-viewport') => number;
    };

    if (!canvas) {
      return;
    }

    const currentScale = canvas.zoom();
    canvas.zoom(Math.max(currentScale + delta, 0.2));
  }
}