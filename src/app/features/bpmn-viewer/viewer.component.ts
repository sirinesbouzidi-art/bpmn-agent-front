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
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { finalize } from 'rxjs';
import { BpmnService } from '../../core/services/bpmn.service';

interface BpmnElement {
  id: string;
  type: string;
  businessObject?: {
    id?: string;
    name?: string;
  };
}
@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container" *ngIf="model() as currentModel">
      <div class="viewer-grid">
        <mat-card class="content-card info-card">
          <h3>Model Info</h3>
          <p><strong>Name:</strong> {{ currentModel.name }}</p>
          <p><strong>Description:</strong> {{ currentModel.description }}</p>
          <p><strong>Creation date:</strong> {{ currentModel.createdAt | date: 'medium' }}</p>
          <p><strong>Status:</strong> {{ currentModel.status }}</p>
        </mat-card>

        <mat-card class="content-card diagram-card">
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
          <div class="diagram-layout">
            <div #canvas class="canvas"></div>
          </div>
        </mat-card>

        <mat-card class="content-card properties-card">
          <h3>Properties</h3>
          <div *ngIf="selectedElement(); else emptySelection" class="properties-form">
            <label>
              Element Type
              <input [value]="selectedElementType" readonly />
            </label>

            <label>
              Element ID
              <input [(ngModel)]="selectedElementId" (blur)="updateElementId()" />
            </label>

            <label>
              Display Name
              <input [(ngModel)]="selectedElementName" (blur)="updateElementName()" />
            </label>

            <button mat-stroked-button type="button" (click)="applySelectionUpdates()">Apply Changes</button>
          </div>

          <ng-template #emptySelection>
            <p class="empty-text">Select a BPMN element to edit its ID and label.</p>
          </ng-template>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .viewer-grid {
        display: grid;
        grid-template-columns: minmax(260px, 0.9fr) minmax(0, 2.2fr) minmax(280px, 1fr);
        gap: 18px;
        align-items: start;
      }

      .diagram-layout {
        min-height: 560px;
      }
      .canvas {
        height: 560px;
        border: 1px solid #dce4f5;
        border-radius: 16px;
        background: linear-gradient(180deg, #ffffff, #f8faff);
        overflow: hidden;
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
      .info-card,
      .properties-card {
        min-height: 560px;
      }

      .properties-form {
        display: grid;
        gap: 12px;
      }

      .properties-form label {
        display: grid;
        gap: 4px;
        color: #3b4f75;
        font-size: 13px;
      }

      .properties-form input {
        height: 38px;
        border-radius: 10px;
        border: 1px solid #cad8fb;
        padding: 0 10px;
        color: #1f2a44;
      }

      .empty-text {
        margin: 0;
        color: #53617f;
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
      @media (max-width: 1280px) {
        .viewer-grid {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.8fr);
        }

        .properties-card {
          grid-column: 1 / -1;
          min-height: 380px;
        }

        .properties-panel {
          min-height: 300px;
        }
      }

      @media (max-width: 992px) {
        .viewer-grid {
          grid-template-columns: 1fr;
        }
        .canvas {
          height: 440px;
        }

        .info-card,
        .properties-card {
          min-height: auto;
        }
      }
    `
  ]
})
export class ViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef?: ElementRef<HTMLDivElement>;
  @ViewChild('propertiesPanel', { static: false }) propertiesPanelRef?: ElementRef<HTMLDivElement>;

  private readonly bpmnService = inject(BpmnService);
  private readonly router = inject(Router);

  readonly model = signal(this.bpmnService.currentModel());
  readonly selectedElement = signal<BpmnElement | null>(null);


  isDeploying = false;
  deployError = false;
  deployMessage = '';
  selectedElementType = '';
  selectedElementId = '';
  selectedElementName = '';


 private modeler?: BpmnModeler;

  async ngAfterViewInit(): Promise<void> {
    if (!this.model()) {
      this.router.navigate(['/home']);
      return;
    }

    if (!this.canvasRef || !this.propertiesPanelRef) {
      return;
    }

 this.modeler = new BpmnModeler({
      container: this.canvasRef.nativeElement
    });

    await this.modeler.importXML(this.model()!.xml);
    this.bindSelectionEvents();
    this.resetZoom();
  }

  zoomIn(): void {
    this.applyZoom(0.2);
  }

  zoomOut(): void {
    this.applyZoom(-0.2);
  }

  resetZoom(): void {
    const canvas = this.modeler?.get('canvas') as { zoom: (mode: 'fit-viewport') => void };
    canvas?.zoom('fit-viewport');
  }

  async exportXml(): Promise<void> {
    const currentModel = this.model();
    if (!currentModel) {
      return;
    }
    const xml = await this.getCurrentXml();
    this.bpmnService.downloadXml({ ...currentModel, xml });
  }

  async exportSvg(): Promise<void> {
    const currentModel = this.model();
    if (!currentModel || !this.modeler) {
      return;
    }

    const result = (await this.modeler.saveSVG()) as { svg: string };
    this.bpmnService.downloadSvg(result.svg, currentModel.name);
  }

  async deployProcess(): Promise<void> {
    const currentModel = this.model();
    if (!currentModel || this.isDeploying) {
      return;
    }

    this.isDeploying = true;
    this.deployError = false;
    this.deployMessage = 'Deploying process...';

    const xml = await this.getCurrentXml();

    this.bpmnService
      .deployXml(xml)
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
   applySelectionUpdates(): void {
    this.updateElementId();
    this.updateElementName();
  }

  updateElementId(): void {
    const element = this.selectedElement();
    const modeling = this.modeler?.get('modeling') as {
      updateProperties: (target: BpmnElement, props: { id: string }) => void;
    };

    if (!element || !modeling || !this.selectedElementId.trim()) {
      return;
    }

    modeling.updateProperties(element, { id: this.selectedElementId.trim() });
    this.refreshSelectedElement(element);
  }

  updateElementName(): void {
    const element = this.selectedElement();
    const modeling = this.modeler?.get('modeling') as {
      updateLabel: (target: BpmnElement, label: string) => void;
      updateProperties: (target: BpmnElement, props: { name: string }) => void;
    };

    if (!element || !modeling) {
      return;
    }

    const name = this.selectedElementName.trim();
    modeling.updateLabel(element, name);
    modeling.updateProperties(element, { name });
    this.refreshSelectedElement(element);
  }


  openCamundaManually(): void {
    window.open('http://localhost:8081', '_blank');
  }

  ngOnDestroy(): void {
    this.modeler?.destroy();
  }

  private applyZoom(delta: number): void {
    const canvas = this.modeler?.get('canvas') as {
      zoom: (newScale?: number | 'fit-viewport') => number;
    };

    if (!canvas) {
      return;
    }

    const currentScale = canvas.zoom();
    canvas.zoom(Math.max(currentScale + delta, 0.2));
  }
private bindSelectionEvents(): void {
    const eventBus = this.modeler?.get('eventBus') as {
      on: (event: string, handler: (payload: { newSelection: BpmnElement[] }) => void) => void;
    };

    eventBus?.on('selection.changed', ({ newSelection }) => {
      if (!newSelection.length) {
        this.selectedElement.set(null);
        this.selectedElementType = '';
        this.selectedElementId = '';
        this.selectedElementName = '';
        return;
      }

      this.refreshSelectedElement(newSelection[0]);
    });
  }

  private refreshSelectedElement(element: BpmnElement): void {
    this.selectedElement.set(element);
    this.selectedElementType = element.type;
    this.selectedElementId = element.businessObject?.id || element.id || '';
    this.selectedElementName = element.businessObject?.name || '';
  }

  private async getCurrentXml(): Promise<string> {
    const currentModel = this.model();

    if (!currentModel || !this.modeler) {
      return currentModel?.xml || '';
    }

    const result = (await this.modeler.saveXML({ format: true })) as { xml: string };
    const updatedModel = { ...currentModel, xml: result.xml };

    this.bpmnService.setCurrentModel(updatedModel);
    this.model.set(updatedModel);

    return result.xml;
  }
}
