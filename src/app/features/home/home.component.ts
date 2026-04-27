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
            <aside class="properties-sidebar">
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
    }

    .canvas-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
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


    .canvas-container {
      flex: 1;
      position: relative;
      background: white;
      margin: 20px;
      margin-bottom: 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
      border-top: 1px solid #e2e8f0;
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
      }
      .properties-sidebar {
        width: 100%;
        border-left: none;
        border-top: 1px solid #e2e8f0;
      }
      .canvas-actions button span {
        display: none;
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

    setTimeout(async () => {
      const model: BpmnModel = {
        id: crypto.randomUUID(),
        name: `Process ${new Date().toLocaleDateString()}`,
        description: userMessage,
        createdAt: new Date().toISOString(),
        status: 'Generated',
        xml: this.generateDynamicXml(userMessage)
      };

      this.currentModel.set(model);
      this.bpmnService.setCurrentModel(model);
      this.historyService.addToHistory(model);
      
      await this.loadDiagram(model.xml);
      this.addMessage('assistant', `✅ BPMN diagram generated and saved to history! You can view it anytime in the History section.`);
      this.isLoading = false;
      setTimeout(() => this.scrollToBottom(), 100);
    }, 2000);
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

    return result.xml;
  }


  private generateDynamicXml(prompt: string): string {

const text = prompt.toLowerCase();

    if (
      text.includes('portabilité') ||
      text.includes('portabilite') ||
      text.includes('portability') ||
      text.includes('ligne') ||
      text.includes('line activation')
    ) {
      return this.getPortabilityXml();
    }

    if (
      text.includes('commande') ||
      text.includes('order') ||
      text.includes('paiement') ||
      text.includes('payment') ||
      text.includes('expédier') ||
      text.includes('expedier') ||
      text.includes('shipping')
    ) {
      return this.getOrderXml();
    }

    if (
      text.includes('abonnement') ||
      text.includes('subscription') ||
      text.includes('renew') ||
      text.includes('renouvel') ||
      text.includes('incident') ||
      text.includes('expiry') ||
      text.includes('expire')
    ) {
      return this.getIncidentXml();
    }

    return this.getDefaultXml();
  }
  private getDefaultXml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Default" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Default" name="Generic Process" isExecutable="true">
    <bpmn:startEvent id="Start_Default" name="Start">
      <bpmn:outgoing>Flow_D1</bpmn:outgoing>
    </bpmn:startEvent>
 <bpmn:task id="Task_Default" name="Review request">
      <bpmn:incoming>Flow_D1</bpmn:incoming>
      <bpmn:outgoing>Flow_D2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="End_Default" name="End">
      <bpmn:incoming>Flow_D2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_D1" sourceRef="Start_Default" targetRef="Task_Default"/>
    <bpmn:sequenceFlow id="Flow_D2" sourceRef="Task_Default" targetRef="End_Default"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_Default">
    <bpmndi:BPMNPlane id="BPMNPlane_Default" bpmnElement="Process_Default">
      <bpmndi:BPMNShape id="Start_Default_di" bpmnElement="Start_Default"><dc:Bounds x="180" y="160" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Default_di" bpmnElement="Task_Default"><dc:Bounds x="280" y="138" width="120" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Default_di" bpmnElement="End_Default"><dc:Bounds x="470" y="160" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_D1_di" bpmnElement="Flow_D1"><di:waypoint x="216" y="178"/><di:waypoint x="280" y="178"/></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_D2_di" bpmnElement="Flow_D2"><di:waypoint x="400" y="178"/><di:waypoint x="470" y="178"/></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
  }
// ==========================
// PORTABILITY (TON XML ACTUEL)
// ==========================
private getPortabilityXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"
  xmlns:modeler="http://camunda.org/schema/modeler/1.0"
  id="Definitions_Portabilite"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="Camunda Modeler"
  exporterVersion="5.0.0"
  modeler:executionPlatform="Camunda Cloud"
  modeler:executionPlatformVersion="8.0.0">

  <bpmn:process id="Process_Portabilite" name="Portabilité Client" isExecutable="true">

    <bpmn:startEvent id="Start_Port" name="Demande de portabilité reçue">
      <bpmn:outgoing>Flow_P1</bpmn:outgoing>
    </bpmn:startEvent>

    <bpmn:serviceTask id="Task_VerifEligibilite" name="Vérifier l'éligibilité">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="verifier-eligibilite" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=clientId" target="clientId"/>
          <zeebe:output source="=eligible" target="eligible"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_P1</bpmn:incoming>
      <bpmn:outgoing>Flow_P2</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:exclusiveGateway id="GW_Eligible" name="Client éligible ?">
      <bpmn:incoming>Flow_P2</bpmn:incoming>
      <bpmn:outgoing>Flow_P_Oui</bpmn:outgoing>
      <bpmn:outgoing>Flow_P_Non</bpmn:outgoing>
    </bpmn:exclusiveGateway>

    <bpmn:serviceTask id="Task_ActiverLigne" name="Activer la ligne">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="activer-ligne" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=clientId" target="clientId"/>
          <zeebe:output source="=activationCode" target="activationCode"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_P_Oui</bpmn:incoming>
      <bpmn:outgoing>Flow_P3</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:sendTask id="Task_NotifSucces" name="Notifier le client">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="notifier-client" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=clientId" target="clientId"/>
          <zeebe:input source="=activationCode" target="activationCode"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_P3</bpmn:incoming>
      <bpmn:outgoing>Flow_P4</bpmn:outgoing>
    </bpmn:sendTask>

    <bpmn:serviceTask id="Task_RejeterPort" name="Rejeter la demande">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="rejeter-demande" retries="1"/>
        <zeebe:ioMapping>
          <zeebe:input source="=clientId" target="clientId"/>
          <zeebe:input source="=motifRejet" target="motifRejet"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_P_Non</bpmn:incoming>
      <bpmn:outgoing>Flow_P5</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:endEvent id="End_PortOK" name="Portabilité activée">
      <bpmn:incoming>Flow_P4</bpmn:incoming>
    </bpmn:endEvent>

    <bpmn:endEvent id="End_PortRejet" name="Demande rejetée">
      <bpmn:incoming>Flow_P5</bpmn:incoming>
    </bpmn:endEvent>

    <bpmn:sequenceFlow id="Flow_P1" sourceRef="Start_Port" targetRef="Task_VerifEligibilite"/>
    <bpmn:sequenceFlow id="Flow_P2" sourceRef="Task_VerifEligibilite" targetRef="GW_Eligible"/>
    <bpmn:sequenceFlow id="Flow_P_Oui" name="Oui" sourceRef="GW_Eligible" targetRef="Task_ActiverLigne">
      <bpmn:conditionExpression>=eligible = true</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_P_Non" name="Non" sourceRef="GW_Eligible" targetRef="Task_RejeterPort">
      <bpmn:conditionExpression>=eligible = false</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_P3" sourceRef="Task_ActiverLigne" targetRef="Task_NotifSucces"/>
    <bpmn:sequenceFlow id="Flow_P4" sourceRef="Task_NotifSucces" targetRef="End_PortOK"/>
    <bpmn:sequenceFlow id="Flow_P5" sourceRef="Task_RejeterPort" targetRef="End_PortRejet"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_Portabilite">
      <bpmndi:BPMNShape id="Start_Port_di" bpmnElement="Start_Port">
        <dc:Bounds x="152" y="232" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="126" y="275" width="89" height="27"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_VerifEligibilite_di" bpmnElement="Task_VerifEligibilite">
        <dc:Bounds x="250" y="210" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="GW_Eligible_di" bpmnElement="GW_Eligible" isMarkerVisible="true">
        <dc:Bounds x="415" y="225" width="50" height="50"/>
        <bpmndi:BPMNLabel><dc:Bounds x="398" y="282" width="85" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_ActiverLigne_di" bpmnElement="Task_ActiverLigne">
        <dc:Bounds x="530" y="210" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_NotifSucces_di" bpmnElement="Task_NotifSucces">
        <dc:Bounds x="700" y="210" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_RejeterPort_di" bpmnElement="Task_RejeterPort">
        <dc:Bounds x="530" y="360" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_PortOK_di" bpmnElement="End_PortOK">
        <dc:Bounds x="872" y="232" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="848" y="275" width="84" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_PortRejet_di" bpmnElement="End_PortRejet">
        <dc:Bounds x="872" y="382" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="851" y="425" width="79" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_P1_di" bpmnElement="Flow_P1">
        <di:waypoint x="188" y="250"/><di:waypoint x="250" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_P2_di" bpmnElement="Flow_P2">
        <di:waypoint x="350" y="250"/><di:waypoint x="415" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_P_Oui_di" bpmnElement="Flow_P_Oui">
        <di:waypoint x="465" y="250"/><di:waypoint x="530" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_P_Non_di" bpmnElement="Flow_P_Non">
        <di:waypoint x="440" y="275"/><di:waypoint x="440" y="400"/><di:waypoint x="530" y="400"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_P3_di" bpmnElement="Flow_P3">
        <di:waypoint x="630" y="250"/><di:waypoint x="700" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_P4_di" bpmnElement="Flow_P4">
        <di:waypoint x="800" y="250"/><di:waypoint x="872" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_P5_di" bpmnElement="Flow_P5">
        <di:waypoint x="630" y="400"/><di:waypoint x="872" y="400"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}


// ==========================
// ORDER PROCESS
// ==========================
private getOrderXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"
  xmlns:modeler="http://camunda.org/schema/modeler/1.0"
  id="Definitions_Commande"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="Camunda Modeler"
  exporterVersion="5.0.0"
  modeler:executionPlatform="Camunda Cloud"
  modeler:executionPlatformVersion="8.0.0">

  <bpmn:process id="Process_Commande" name="Commande et Expédition" isExecutable="true">

    <bpmn:startEvent id="Start_Cmd" name="Commande passée">
      <bpmn:outgoing>Flow_C1</bpmn:outgoing>
    </bpmn:startEvent>

    <bpmn:serviceTask id="Task_ValiderPaiement" name="Valider le paiement">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="valider-paiement" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=orderId" target="orderId"/>
          <zeebe:input source="=montant" target="montant"/>
          <zeebe:output source="=paiementValide" target="paiementValide"/>
          <zeebe:output source="=motifEchec" target="motifEchec"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_C1</bpmn:incoming>
      <bpmn:outgoing>Flow_C2</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:exclusiveGateway id="GW_Paiement" name="Paiement validé ?">
      <bpmn:incoming>Flow_C2</bpmn:incoming>
      <bpmn:outgoing>Flow_C_OK</bpmn:outgoing>
      <bpmn:outgoing>Flow_C_KO</bpmn:outgoing>
    </bpmn:exclusiveGateway>

    <bpmn:serviceTask id="Task_PreparerColis" name="Préparer le colis">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="preparer-colis" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=orderId" target="orderId"/>
          <zeebe:output source="=colisId" target="colisId"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_C_OK</bpmn:incoming>
      <bpmn:outgoing>Flow_C3</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:serviceTask id="Task_ExpedierProduit" name="Expédier le produit">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="expedier-produit" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=colisId" target="colisId"/>
          <zeebe:input source="=adresseLivraison" target="adresseLivraison"/>
          <zeebe:output source="=trackingNumber" target="trackingNumber"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_C3</bpmn:incoming>
      <bpmn:outgoing>Flow_C4</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:sendTask id="Task_NotifExpedition" name="Notifier l'expédition">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="notifier-expedition" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=orderId" target="orderId"/>
          <zeebe:input source="=trackingNumber" target="trackingNumber"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_C4</bpmn:incoming>
      <bpmn:outgoing>Flow_C5</bpmn:outgoing>
    </bpmn:sendTask>

    <bpmn:sendTask id="Task_NotifEchec" name="Notifier l'échec du paiement">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="notifier-echec-paiement" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=orderId" target="orderId"/>
          <zeebe:input source="=motifEchec" target="motifEchec"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_C_KO</bpmn:incoming>
      <bpmn:outgoing>Flow_C6</bpmn:outgoing>
    </bpmn:sendTask>

    <bpmn:endEvent id="End_CmdOK" name="Commande expédiée">
      <bpmn:incoming>Flow_C5</bpmn:incoming>
    </bpmn:endEvent>

    <bpmn:endEvent id="End_CmdKO" name="Commande annulée">
      <bpmn:incoming>Flow_C6</bpmn:incoming>
    </bpmn:endEvent>

    <bpmn:sequenceFlow id="Flow_C1" sourceRef="Start_Cmd" targetRef="Task_ValiderPaiement"/>
    <bpmn:sequenceFlow id="Flow_C2" sourceRef="Task_ValiderPaiement" targetRef="GW_Paiement"/>
    <bpmn:sequenceFlow id="Flow_C_OK" name="Oui" sourceRef="GW_Paiement" targetRef="Task_PreparerColis">
      <bpmn:conditionExpression>=paiementValide = true</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_C_KO" name="Non" sourceRef="GW_Paiement" targetRef="Task_NotifEchec">
      <bpmn:conditionExpression>=paiementValide = false</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_C3" sourceRef="Task_PreparerColis" targetRef="Task_ExpedierProduit"/>
    <bpmn:sequenceFlow id="Flow_C4" sourceRef="Task_ExpedierProduit" targetRef="Task_NotifExpedition"/>
    <bpmn:sequenceFlow id="Flow_C5" sourceRef="Task_NotifExpedition" targetRef="End_CmdOK"/>
    <bpmn:sequenceFlow id="Flow_C6" sourceRef="Task_NotifEchec" targetRef="End_CmdKO"/>

  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_Cmd">
    <bpmndi:BPMNPlane id="BPMNPlane_Cmd" bpmnElement="Process_Commande">
      <bpmndi:BPMNShape id="Start_Cmd_di" bpmnElement="Start_Cmd">
        <dc:Bounds x="152" y="232" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="135" y="275" width="71" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_ValiderPaiement_di" bpmnElement="Task_ValiderPaiement">
        <dc:Bounds x="250" y="210" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="GW_Paiement_di" bpmnElement="GW_Paiement" isMarkerVisible="true">
        <dc:Bounds x="415" y="225" width="50" height="50"/>
        <bpmndi:BPMNLabel><dc:Bounds x="398" y="282" width="85" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_PreparerColis_di" bpmnElement="Task_PreparerColis">
        <dc:Bounds x="530" y="210" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_ExpedierProduit_di" bpmnElement="Task_ExpedierProduit">
        <dc:Bounds x="700" y="210" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_NotifExpedition_di" bpmnElement="Task_NotifExpedition">
        <dc:Bounds x="870" y="210" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_NotifEchec_di" bpmnElement="Task_NotifEchec">
        <dc:Bounds x="530" y="360" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_CmdOK_di" bpmnElement="End_CmdOK">
        <dc:Bounds x="1042" y="232" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="1018" y="275" width="84" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_CmdKO_di" bpmnElement="End_CmdKO">
        <dc:Bounds x="872" y="382" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="848" y="425" width="84" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_C1_di" bpmnElement="Flow_C1">
        <di:waypoint x="188" y="250"/><di:waypoint x="250" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_C2_di" bpmnElement="Flow_C2">
        <di:waypoint x="350" y="250"/><di:waypoint x="415" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_C_OK_di" bpmnElement="Flow_C_OK">
        <di:waypoint x="465" y="250"/><di:waypoint x="530" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_C_KO_di" bpmnElement="Flow_C_KO">
        <di:waypoint x="440" y="275"/><di:waypoint x="440" y="400"/><di:waypoint x="530" y="400"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_C3_di" bpmnElement="Flow_C3">
        <di:waypoint x="630" y="250"/><di:waypoint x="700" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_C4_di" bpmnElement="Flow_C4">
        <di:waypoint x="800" y="250"/><di:waypoint x="870" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_C5_di" bpmnElement="Flow_C5">
        <di:waypoint x="970" y="250"/><di:waypoint x="1042" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_C6_di" bpmnElement="Flow_C6">
        <di:waypoint x="630" y="400"/><di:waypoint x="872" y="400"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}
// ==========================
// INCIDENT PROCESS
// ==========================
private getIncidentXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"
  xmlns:modeler="http://camunda.org/schema/modeler/1.0"
  id="Definitions_Abonnement"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="Camunda Modeler"
  exporterVersion="5.0.0"
  modeler:executionPlatform="Camunda Cloud"
  modeler:executionPlatformVersion="8.0.0">

  <bpmn:process id="Process_Abonnement" name="Expiration Abonnement" isExecutable="true">

    <bpmn:startEvent id="Start_Abo" name="Abonnement expiré">
      <bpmn:outgoing>Flow_A1</bpmn:outgoing>
    </bpmn:startEvent>

    <bpmn:sendTask id="Task_EnvoyerRappel" name="Envoyer un rappel">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="envoyer-rappel" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=clientId" target="clientId"/>
          <zeebe:input source="=abonnementId" target="abonnementId"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_A1</bpmn:incoming>
      <bpmn:outgoing>Flow_A2</bpmn:outgoing>
    </bpmn:sendTask>

    <bpmn:intermediateCatchEvent id="Timer_Attente" name="Attendre 48h">
      <bpmn:incoming>Flow_A2</bpmn:incoming>
      <bpmn:outgoing>Flow_A3</bpmn:outgoing>
      <bpmn:timerEventDefinition id="TimerDef_1">
        <bpmn:timeDuration>PT48H</bpmn:timeDuration>
      </bpmn:timerEventDefinition>
    </bpmn:intermediateCatchEvent>

    <bpmn:serviceTask id="Task_VerifRenouvellement" name="Vérifier le renouvellement">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="verifier-renouvellement" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=abonnementId" target="abonnementId"/>
          <zeebe:output source="=renouvelé" target="renouvelé"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_A3</bpmn:incoming>
      <bpmn:outgoing>Flow_A4</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:exclusiveGateway id="GW_Renouvele" name="Abonnement renouvelé ?">
      <bpmn:incoming>Flow_A4</bpmn:incoming>
      <bpmn:outgoing>Flow_A_Oui</bpmn:outgoing>
      <bpmn:outgoing>Flow_A_Non</bpmn:outgoing>
    </bpmn:exclusiveGateway>

    <bpmn:serviceTask id="Task_DesactiverService" name="Désactiver le service">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="desactiver-service" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=clientId" target="clientId"/>
          <zeebe:input source="=abonnementId" target="abonnementId"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_A_Non</bpmn:incoming>
      <bpmn:outgoing>Flow_A5</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:sendTask id="Task_NotifDesactivation" name="Notifier la désactivation">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="notifier-desactivation" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=clientId" target="clientId"/>
          <zeebe:input source="=abonnementId" target="abonnementId"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_A5</bpmn:incoming>
      <bpmn:outgoing>Flow_A6</bpmn:outgoing>
    </bpmn:sendTask>

    <bpmn:endEvent id="End_AboActif" name="Abonnement actif">
      <bpmn:incoming>Flow_A_Oui</bpmn:incoming>
    </bpmn:endEvent>

    <bpmn:endEvent id="End_AboDesactive" name="Service désactivé">
      <bpmn:incoming>Flow_A6</bpmn:incoming>
    </bpmn:endEvent>

    <bpmn:sequenceFlow id="Flow_A1" sourceRef="Start_Abo" targetRef="Task_EnvoyerRappel"/>
    <bpmn:sequenceFlow id="Flow_A2" sourceRef="Task_EnvoyerRappel" targetRef="Timer_Attente"/>
    <bpmn:sequenceFlow id="Flow_A3" sourceRef="Timer_Attente" targetRef="Task_VerifRenouvellement"/>
    <bpmn:sequenceFlow id="Flow_A4" sourceRef="Task_VerifRenouvellement" targetRef="GW_Renouvele"/>
    <bpmn:sequenceFlow id="Flow_A_Oui" name="Oui" sourceRef="GW_Renouvele" targetRef="End_AboActif">
      <bpmn:conditionExpression>=renouvelé = true</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_A_Non" name="Non" sourceRef="GW_Renouvele" targetRef="Task_DesactiverService">
      <bpmn:conditionExpression>=renouvelé = false</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_A5" sourceRef="Task_DesactiverService" targetRef="Task_NotifDesactivation"/>
    <bpmn:sequenceFlow id="Flow_A6" sourceRef="Task_NotifDesactivation" targetRef="End_AboDesactive"/>

  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_Abo">
    <bpmndi:BPMNPlane id="BPMNPlane_Abo" bpmnElement="Process_Abonnement">
      <bpmndi:BPMNShape id="Start_Abo_di" bpmnElement="Start_Abo">
        <dc:Bounds x="152" y="232" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="130" y="275" width="81" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_EnvoyerRappel_di" bpmnElement="Task_EnvoyerRappel">
        <dc:Bounds x="250" y="210" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Timer_Attente_di" bpmnElement="Timer_Attente">
        <dc:Bounds x="412" y="232" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="396" y="275" width="68" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_VerifRenouvellement_di" bpmnElement="Task_VerifRenouvellement">
        <dc:Bounds x="510" y="210" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="GW_Renouvele_di" bpmnElement="GW_Renouvele" isMarkerVisible="true">
        <dc:Bounds x="675" y="225" width="50" height="50"/>
        <bpmndi:BPMNLabel><dc:Bounds x="655" y="282" width="90" height="27"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_DesactiverService_di" bpmnElement="Task_DesactiverService">
        <dc:Bounds x="790" y="360" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_NotifDesactivation_di" bpmnElement="Task_NotifDesactivation">
        <dc:Bounds x="960" y="360" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_AboActif_di" bpmnElement="End_AboActif">
        <dc:Bounds x="962" y="232" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="940" y="275" width="80" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_AboDesactive_di" bpmnElement="End_AboDesactive">
        <dc:Bounds x="1132" y="382" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="1108" y="425" width="84" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_A1_di" bpmnElement="Flow_A1">
        <di:waypoint x="188" y="250"/><di:waypoint x="250" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_A2_di" bpmnElement="Flow_A2">
        <di:waypoint x="350" y="250"/><di:waypoint x="412" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_A3_di" bpmnElement="Flow_A3">
        <di:waypoint x="448" y="250"/><di:waypoint x="510" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_A4_di" bpmnElement="Flow_A4">
        <di:waypoint x="610" y="250"/><di:waypoint x="675" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_A_Oui_di" bpmnElement="Flow_A_Oui">
        <di:waypoint x="725" y="250"/><di:waypoint x="962" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_A_Non_di" bpmnElement="Flow_A_Non">
        <di:waypoint x="700" y="275"/><di:waypoint x="700" y="400"/><di:waypoint x="790" y="400"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_A5_di" bpmnElement="Flow_A5">
        <di:waypoint x="890" y="400"/><di:waypoint x="960" y="400"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_A6_di" bpmnElement="Flow_A6">
        <di:waypoint x="1060" y="400"/><di:waypoint x="1132" y="400"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}
}