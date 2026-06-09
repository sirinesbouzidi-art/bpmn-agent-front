import { CommonModule } from '@angular/common';
import { Component, inject, AfterViewInit, ViewChild, ElementRef, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { BpmnService } from '../../core/services/bpmn.service';
import { HistoryService } from '../../core/services/history.service';
import { BpmnModel } from '../../shared/models/bpmn.model';
import BpmnModeler from 'bpmn-js/lib/Modeler';
interface BpmnElement {
  id: string;
  type: string;
  businessObject?: {
    id?: string;
    name?: string;
  };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="workspace-container">
      <!-- Sidebar gauche - Chat/Input -->
      <aside class="chat-sidebar" [class.collapsed]="isSidebarCollapsed">
        <div class="sidebar-header">
          <h2 *ngIf="!isSidebarCollapsed">BPMN Studio</h2>
          <div class="header-actions">
            <button mat-icon-button routerLink="/history" title="History" *ngIf="!isSidebarCollapsed">
              <mat-icon>history</mat-icon>
              <span class="history-badge" *ngIf="historyCount() > 0">{{ historyCount() }}</span>
            </button>
            <button mat-icon-button (click)="toggleSidebar()" [matTooltip]="isSidebarCollapsed ? 'Expand chat' : 'Collapse chat'">
              <mat-icon>{{ isSidebarCollapsed ? 'chevron_right' : 'chevron_left' }}</mat-icon>
            </button>
          </div>
        </div>

        <!-- Contenu du chat (visible uniquement quand déployé) -->
        <div class="chat-content" *ngIf="!isSidebarCollapsed">
          <div class="messages-container" #messagesContainer>
            <div *ngFor="let message of messages()" class="message" [class.user]="message.role === 'user'" [class.assistant]="message.role === 'assistant'">
              <div class="message-avatar">
                <mat-icon *ngIf="message.role === 'user'">person</mat-icon>
                <mat-icon *ngIf="message.role === 'assistant'">smart_toy</mat-icon>
              </div>
              <div class="message-content">
                <div class="message-text">{{ message.content }}</div>
                <div class="message-timestamp">{{ message.timestamp | date:'shortTime' }}</div>
              </div>
            </div>
            <div *ngIf="isLoading" class="message assistant">
              <div class="message-avatar">
                <mat-icon>smart_toy</mat-icon>
              </div>
              <div class="message-content">
                <div class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>

          <div class="input-area">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Describe your process...</mat-label>
              <textarea matInput rows="3" [formControl]="promptControl" placeholder="Ex: Lorsqu'un client demande une portabilité, vérifier son éligibilité puis activer la ligne."></textarea>
            </mat-form-field>
            <div class="input-actions">
              <div class="examples">
                <button mat-stroked-button size="small" *ngFor="let example of examples" (click)="selectExample(example)">
                  <mat-icon>bolt</mat-icon>
                  {{ example | slice:0:40 }}{{ example.length > 40 ? '...' : '' }}
                </button>
              </div>
              <button mat-flat-button color="primary" (click)="generate()" [disabled]="!promptControl.value || isLoading">
                <mat-icon>auto_awesome</mat-icon>
                Generate BPMN
              </button>
            </div>
          </div>
        </div>

        <!-- Vue miniature du chat quand collapsed -->
        <div class="chat-mini" *ngIf="isSidebarCollapsed">
          <button mat-icon-button class="mini-chat-btn" (click)="toggleSidebar()" matTooltip="Open chat">
            <mat-icon>chat</mat-icon>
          </button>
          <div class="mini-history-badge" *ngIf="historyCount() > 0">
            {{ historyCount() }}
          </div>
        </div>
      </aside>

      <!-- Zone centrale - Canvas BPMN -->
      <main class="canvas-area">
        <div class="canvas-header">
          <div class="model-info" *ngIf="currentModel()">
            <h3>{{ currentModel()?.name }}</h3>
            <p class="status-badge" [class.generated]="currentModel()?.status === 'Generated'">
              {{ currentModel()?.status }}
            </p>
          </div>
          <div class="canvas-actions">
            <button
              mat-stroked-button
              type="button"
              class="properties-toggle-btn"
              (click)="togglePropertiesPanel()"
              [matTooltip]="isPropertiesPanelVisible ? 'Hide properties panel' : 'Show properties panel'"
            >
              <mat-icon>{{ isPropertiesPanelVisible ? 'dock_to_right' : 'menu_open' }}</mat-icon>
              {{ isPropertiesPanelVisible ? 'Hide properties' : 'Show properties' }}
            </button>
            <button mat-icon-button (click)="zoomIn()" title="Zoom in" matTooltip="Zoom in">
              <mat-icon>zoom_in</mat-icon>
            </button>
            <button mat-icon-button (click)="zoomOut()" title="Zoom out" matTooltip="Zoom out">
              <mat-icon>zoom_out</mat-icon>
            </button>
            <button mat-icon-button (click)="resetZoom()" title="Fit to view" matTooltip="Fit to view">
              <mat-icon>center_focus_strong</mat-icon>
            </button>
            <span class="divider"></span>
            <button mat-stroked-button (click)="exportXml()" [disabled]="!currentModel()" matTooltip="Export as XML">
              <mat-icon>description</mat-icon>
              Export XML
            </button>
            <button mat-stroked-button (click)="exportSvg()" [disabled]="!currentModel()" matTooltip="Export as SVG">
              <mat-icon>image</mat-icon>
              Export SVG
            </button>
             <button
              mat-flat-button
              color="primary"
              class="deploy-btn"
              (click)="deployCurrentModel()"
              [disabled]="!currentModel() || isDeploying"
              matTooltip="Deploy BPMN process"
            >
              {{ isDeploying ? 'Deploying...' : 'Deploy BPMN' }}
            </button>
          </div>
        </div>
        <div class="canvas-container">
          <div #canvas class="bpmn-canvas"></div>
          <div class="empty-state" *ngIf="!currentModel() && !isLoading">
            <mat-icon class="empty-icon">account_tree</mat-icon>
            <h3>No BPMN model yet</h3>
            <p>Describe your process in the chat to generate a BPMN diagram</p>
          </div>
        </div>
        
        <!-- Footer avec liens de navigation -->
        <div class="canvas-footer">
          <div class="footer-links">
            <a routerLink="/about">About</a>
            <a routerLink="/home">Home</a>
            <a routerLink="/history">History</a>
            <a (click)="logout()" class="logout-link">Logout</a>
          </div>
          <div class="footer-brand">
            <span>BPMN.io</span>
          </div>
        </div>
      </main>
      <aside class="properties-sidebar" [class.hidden]="!isPropertiesPanelVisible">
        <div class="properties-header">
          <h3>Properties</h3>
        </div>

        <div *ngIf="selectedElement(); else noSelection" class="properties-form">
          <label>
            Element type
            <input [value]="selectedElementType" readonly />
          </label>

          <label>
            Element ID
            <input [(ngModel)]="selectedElementId" (blur)="updateElementId()" />
          </label>

          <label>
            Label
            <input [(ngModel)]="selectedElementName" (blur)="updateElementName()" />
          </label>

          <button mat-stroked-button type="button" (click)="applySelectionUpdates()">
            Apply changes
          </button>
        </div>

        <ng-template #noSelection>
          <p class="no-selection-text">Select a BPMN element to edit it.</p>
        </ng-template>
      </aside>
    </div>
  `,
  styles: [`
    .workspace-container {
      display: flex;
      height: calc(100vh - 64px);
      background: #f8fafc;
      overflow: hidden;
      gap: 0;
    }

    /* Sidebar styles */
    .chat-sidebar {
      width: 400px;
      background: white;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      transition: width 0.3s ease;
      overflow: hidden;
      position: relative;
    }

    .chat-sidebar.collapsed {
      width: 64px;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e2e8f0;
      background: white;
      min-height: 73px;
    }

    .sidebar-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      position: relative;
    }

    .history-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Chat mini (quand collapsed) */
    .chat-mini {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0;
      gap: 16px;
    }

    .mini-chat-btn {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      width: 40px;
      height: 40px;
    }

    .mini-chat-btn mat-icon {
      font-size: 24px;
    }

    .mini-history-badge {
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .mini-history-badge:hover {
      transform: scale(1.1);
    }

    .chat-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .message {
      display: flex;
      gap: 12px;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .message.user .message-avatar {
      background: #4f46e5;
      color: white;
    }

    .message.assistant .message-avatar {
      background: #f1f5f9;
      color: #4f46e5;
    }

    .message-avatar mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .message-content {
      flex: 1;
    }

    .message-text {
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 12px;
      line-height: 1.5;
      font-size: 14px;
    }

    .message.user .message-text {
      background: #4f46e5;
      color: white;
    }

    .message-timestamp {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      background: #f8fafc;
      border-radius: 12px;
      width: fit-content;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
      animation: typing 1.4s infinite;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.4;
      }
      30% {
        transform: translateY(-10px);
        opacity: 1;
      }
    }

    .input-area {
      padding: 20px;
      border-top: 1px solid #e2e8f0;
      background: white;
    }

    .full-width {
      width: 100%;
    }

    .input-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 12px;
    }

    .examples {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .examples button {
      font-size: 12px;
      padding: 4px 12px;
    }

    .examples button mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      margin-right: 4px;
    }

    button[mat-flat-button] {
      width: 100%;
      padding: 10px;
      background: linear-gradient(90deg, #4f46e5, #7c3aed);
    }

    /* Canvas area */
    .canvas-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
      padding: 12px 12px 0;
      gap: 12px;
    }

    .canvas-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: white;
      border-bottom: 1px solid #e2e8f0;
    }

    .model-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .model-info h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      background: #e2e8f0;
      color: #475569;
    }

    .status-badge.generated {
      background: #d9f99d;
      color: #365314;
    }

    .canvas-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .divider {
      width: 1px;
      height: 30px;
      background: #e2e8f0;
      margin: 0 4px;
    }

    .deploy-btn {
      border-radius: 12px;
    }
    .properties-toggle-btn {
      border-radius: 10px;
      white-space: nowrap;
    }



    .canvas-container {
      flex: 1;
      position: relative;
      background: white;
      margin: 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #e2e8f0;
    }

    .bpmn-canvas {
      width: 100%;
      height: 100%;
      background: white;
    }

    .empty-state {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #94a3b8;
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }

    /* Footer */
    .canvas-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px 12px 0 0;
      margin-top: auto;
    }

    .footer-links {
      display: flex;
      gap: 24px;
    }

    .footer-links a {
      color: #64748b;
      text-decoration: none;
      font-size: 13px;
      transition: color 0.2s;
      cursor: pointer;
    }

    .footer-links a:hover {
      color: #4f46e5;
    }

    .logout-link:hover {
      color: #ef4444 !important;
    }

    .footer-brand {
      color: #94a3b8;
      font-size: 12px;
    }
    .properties-sidebar {
      width: 320px;
      background: white;
      border-left: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 12px;
      overflow-y: auto;
       transition: width 0.25s ease, padding 0.25s ease, opacity 0.2s ease;
    }

    .properties-sidebar.hidden {
      width: 0;
      padding-left: 0;
      padding-right: 0;
      border-left: none;
      opacity: 0;
      overflow: hidden;
    }

    .properties-header h3 {
      margin: 0;
      font-size: 18px;
      color: #1e293b;
    }

    .properties-form {
      display: grid;
      gap: 12px;
    }

    .properties-form label {
      display: grid;
      gap: 6px;
      font-size: 12px;
      color: #475569;
    }

    .properties-form input {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      height: 38px;
      padding: 0 10px;
      font-size: 14px;
    }

    .no-selection-text {
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .workspace-container {
        flex-direction: column;
      }

      .chat-sidebar {
        width: 100%;
        height: 50%;
      }

      .chat-sidebar.collapsed {
        width: 100%;
        height: 64px;
      }

      .canvas-area {
        height: 50%;
        padding: 8px 8px 0;
      }
      .properties-sidebar {
        width: 100%;
        border-left: none;
        border-top: 1px solid #e2e8f0;
      }
      .properties-sidebar.hidden {
        width: 100%;
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
        border-top: none;
      }
      .canvas-actions button span {
        display: none;
      }
      .canvas-footer {
        padding: 10px 12px;
      }
      .footer-links {
        gap: 12px;
        flex-wrap: wrap;
      }
    }
  `]
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef?: ElementRef<HTMLDivElement>;
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  private readonly fb = inject(FormBuilder);
  private readonly bpmnService = inject(BpmnService);
  private readonly historyService = inject(HistoryService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  isLoading = false;
  isDeploying = false;
  isSidebarCollapsed = false;
  isPropertiesPanelVisible = false;
  currentModel = signal<BpmnModel | null>(null);
  messages = signal<Array<{ role: 'user' | 'assistant', content: string, timestamp: Date }>>([]);
  historyCount = signal<number>(0);
  promptControl = this.fb.control('', [Validators.minLength(10)]);
  selectedElement = signal<BpmnElement | null>(null);
  selectedElementType = '';
  selectedElementId = '';
  selectedElementName = '';

  readonly examples: string[] = [
    'Lorsqu\'un client demande une portabilité, vérifier son éligibilité puis activer la ligne.',
    'Lorsqu\'une commande est passée, valider le paiement puis expédier le produit.',
    'Lorsqu\' un abonnement expire, envoyer un rappel et désactiver le service si non renouvelé.'
  ];

  modeler: BpmnModeler | null = null;

  constructor() {
    this.updateHistoryCount();
    this.historyService.history$.subscribe(() => {
      this.updateHistoryCount();
    });
  }

  ngAfterViewInit(): void {
    if (this.canvasRef) {
      this.modeler = new BpmnModeler({ container: this.canvasRef.nativeElement });
      this.bindSelectionEvents();
      this.bindAutoSaveEvents();
    }
  }

  ngOnDestroy(): void {
    this.modeler?.destroy();
  }

  updateHistoryCount(): void {
    this.historyCount.set(this.historyService.getHistory().length);
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  togglePropertiesPanel(): void {
    this.isPropertiesPanelVisible = !this.isPropertiesPanelVisible;
  }


  selectExample(example: string): void {
    this.promptControl.setValue(example);
  }

  async generate(): Promise<void> {
  if (!this.promptControl.value || this.promptControl.value.length < 10) {
    this.snackBar.open('Minimum 10 characters required', 'Close', { duration: 3000 });
    return;
  }

  const userMessage = this.promptControl.value;
  this.addMessage('user', userMessage);
  this.promptControl.reset();
  this.isLoading = true;

  this.bpmnService.generateBpmn(userMessage).subscribe({
    next: async (xml: string) => {
      const model: BpmnModel = {
        id: crypto.randomUUID(),
        name: `Process ${new Date().toLocaleDateString()}`,
        description: userMessage,
        date: new Date(),
        status: 'Generated',
        xml
      };

      this.currentModel.set(model);
      this.bpmnService.setCurrentModel(model);
      this.historyService.addToHistory(model);

      await this.loadDiagram(xml);
      this.addMessage('assistant', `✅ BPMN diagram generated and saved to history! You can view it anytime in the History section.`);
      this.isLoading = false;
      setTimeout(() => this.scrollToBottom(), 100);
    },
    error: (err) => {
      console.error('Generation error:', err);
      this.addMessage('assistant', `❌ Error generating BPMN diagram. Please check that the agent and Spring Boot are running.`);
      this.isLoading = false;
    }
  });
}

  private async loadDiagram(xml: string): Promise<void> {
    if (!this.modeler) return;
    try {
      await this.modeler.importXML(xml);
      this.resetZoom();
    } catch (err) {
      console.error('Error loading diagram:', err);
      this.snackBar.open('Error loading BPMN diagram', 'Close', { duration: 3000 });
    }
  }

zoomIn(): void {
  const canvas = this.modeler?.get('canvas') as { zoom: (level?: number | 'fit-viewport') => number };
  if (canvas) {
    const currentZoom = canvas.zoom();
    canvas.zoom(currentZoom + 0.1);
  }
}

zoomOut(): void {
  const canvas = this.modeler?.get('canvas') as { zoom: (level?: number | 'fit-viewport') => number };
  if (canvas) {
    const currentZoom = canvas.zoom();
    canvas.zoom(Math.max(0.1, currentZoom - 0.1));
  }
}

resetZoom(): void {
  const canvas = this.modeler?.get('canvas') as { zoom: (mode: 'fit-viewport') => void };
  canvas?.zoom('fit-viewport');
}

  async exportXml(): Promise<void> {
    const model = this.currentModel();
    if (!model) return;
    const xml = await this.getCurrentXml();
    this.bpmnService.downloadXml({ ...model, xml });
    this.snackBar.open('XML exported successfully', 'Close', { duration: 2000 });
  }

  async exportSvg(): Promise<void> {
    const model = this.currentModel();
    if (!model || !this.modeler) return;
    const result = (await this.modeler.saveSVG()) as { svg: string };
    this.bpmnService.downloadSvg(result.svg, model.name);
    this.snackBar.open('SVG exported successfully', 'Close', { duration: 2000 });
  }
    async deployCurrentModel(): Promise<void> {
    const model = this.currentModel();
    if (!model || this.isDeploying) {
      return;
    }

    this.isDeploying = true;
    const xml = await this.getCurrentXml();

    this.bpmnService
      .deployXml(xml)
      .pipe(finalize(() => (this.isDeploying = false)))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.snackBar.open(response.message || 'Deployment failed', 'Close', { duration: 3000 });
            return;
          }

          this.snackBar.open('Process deployed successfully. Opening Camunda...', 'Close', { duration: 3000 });
          setTimeout(() => {
            window.open('http://localhost:8081', '_blank');
          }, 1000);
        },
        error: () => {
          this.snackBar.open('Deployment failed. Please try again.', 'Close', { duration: 3000 });
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

  logout(): void {
    // Implémentez votre logique de déconnexion ici
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
    this.snackBar.open('Logged out successfully', 'Close', { duration: 2000 });
  }

  private addMessage(role: 'user' | 'assistant', content: string): void {
    this.messages.update(msgs => [...msgs, { role, content, timestamp: new Date() }]);
    setTimeout(() => this.scrollToBottom(), 100);
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    }
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
      
      this.isPropertiesPanelVisible = true;
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
    const model = this.currentModel();

    if (!model || !this.modeler) {
      return model?.xml || '';
    }

    const result = (await this.modeler.saveXML({ format: true })) as { xml: string };
    const updatedModel = { ...model, xml: result.xml };

    this.currentModel.set(updatedModel);
    this.bpmnService.setCurrentModel(updatedModel);
    this.historyService.updateHistoryItem(updatedModel.id, { xml: result.xml });

    return result.xml;
  }
  private bindAutoSaveEvents(): void {
    const eventBus = this.modeler?.get('eventBus') as {
      on: (event: string, handler: () => void) => void;
    };

    eventBus?.on('commandStack.changed', async () => {
      const model = this.currentModel();
      if (!model || !this.modeler) return;

      const result = (await this.modeler.saveXML({ format: true })) as { xml: string };
      const updatedModel = { ...model, xml: result.xml };

      this.currentModel.set(updatedModel);
      this.bpmnService.setCurrentModel(updatedModel);
      this.historyService.updateHistoryItem(model.id, { xml: result.xml });
    });
  }
}