import { CommonModule } from '@angular/common';
import { Component, inject, AfterViewInit, ViewChild, ElementRef, OnDestroy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { BpmnService } from '../../core/services/bpmn.service';
import { HistoryService } from '../../core/services/history.service';
import { BpmnModel } from '../../shared/models/bpmn.model';
import BpmnJS from 'bpmn-js/lib/NavigatedViewer';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
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
  isSidebarCollapsed = false;
  currentModel = signal<BpmnModel | null>(null);
  messages = signal<Array<{ role: 'user' | 'assistant', content: string, timestamp: Date }>>([]);
  historyCount = signal<number>(0);
  promptControl = this.fb.control('', [Validators.minLength(10)]);

  readonly examples: string[] = [
    'Lorsqu\'un client demande une portabilité, vérifier son éligibilité puis activer la ligne.',
    'Si le paiement échoue, envoyer une notification et suspendre le service.',
    'Lorsqu\'un ticket incident est créé, assigner au support niveau 1.'
  ];

  private viewer?: BpmnJS;

  constructor() {
    this.updateHistoryCount();
    this.historyService.history$.subscribe(() => {
      this.updateHistoryCount();
    });
  }

  ngAfterViewInit(): void {
    if (this.canvasRef) {
      this.viewer = new BpmnJS({ container: this.canvasRef.nativeElement });
    }
  }

  ngOnDestroy(): void {
    this.viewer?.destroy();
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
    if (!this.viewer) return;
    try {
      await this.viewer.importXML(xml);
      this.resetZoom();
    } catch (err) {
      console.error('Error loading diagram:', err);
      this.snackBar.open('Error loading BPMN diagram', 'Close', { duration: 3000 });
    }
  }

zoomIn(): void {
  const canvas = this.viewer?.get('canvas') as { zoom: (level?: number | 'fit-viewport') => number };
  if (canvas) {
    const currentZoom = canvas.zoom();
    canvas.zoom(currentZoom + 0.1);
  }
}

zoomOut(): void {
  const canvas = this.viewer?.get('canvas') as { zoom: (level?: number | 'fit-viewport') => number };
  if (canvas) {
    const currentZoom = canvas.zoom();
    canvas.zoom(Math.max(0.1, currentZoom - 0.1));
  }
}

resetZoom(): void {
  const canvas = this.viewer?.get('canvas') as { zoom: (mode: 'fit-viewport') => void };
  canvas?.zoom('fit-viewport');
}

  exportXml(): void {
    const model = this.currentModel();
    if (!model) return;
    this.bpmnService.downloadXml(model);
    this.snackBar.open('XML exported successfully', 'Close', { duration: 2000 });
  }

  async exportSvg(): Promise<void> {
    const model = this.currentModel();
    if (!model || !this.viewer) return;
    const result = (await this.viewer.saveSVG()) as { svg: string };
    this.bpmnService.downloadSvg(result.svg, model.name);
    this.snackBar.open('SVG exported successfully', 'Close', { duration: 2000 });
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

  private generateDynamicXml(prompt: string): string {
  const words = prompt.split(' ');
  const processName = words.slice(0, 3).join(' ');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions 
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"
  xmlns:modeler="http://camunda.org/schema/modeler/1.0"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="Camunda Modeler"
  exporterVersion="5.0.0"
  modeler:executionPlatform="Camunda Cloud"
  modeler:executionPlatformVersion="8.0.0">

  <bpmn:process id="Process_Portabilite" name="Portabilité Client" isExecutable="true">

    <!-- Start Event -->
    <bpmn:startEvent id="StartEvent_1" name="Demande de portabilité reçue">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>

    <!-- Task 1: Vérifier éligibilité (Service Task - appel API) -->
    <bpmn:serviceTask id="Task_VerifierEligibilite" name="Vérifier l&#39;éligibilité">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="verifier-eligibilite" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=clientId" target="clientId"/>
          <zeebe:output source="=eligible" target="eligible"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:serviceTask>

    <!-- Gateway: Éligible ? -->
    <bpmn:exclusiveGateway id="Gateway_Eligibilite" name="Client éligible ?">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_Oui</bpmn:outgoing>
      <bpmn:outgoing>Flow_Non</bpmn:outgoing>
    </bpmn:exclusiveGateway>

    <!-- Task 2: Activer la ligne (Service Task) -->
    <bpmn:serviceTask id="Task_ActiverLigne" name="Activer la ligne">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="activer-ligne" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=clientId" target="clientId"/>
          <zeebe:output source="=activationCode" target="activationCode"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_Oui</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:serviceTask>

    <!-- Task 3: Notifier le client (Send Task) -->
    <bpmn:sendTask id="Task_NotifierClient" name="Notifier le client">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="notifier-client" retries="3"/>
        <zeebe:ioMapping>
          <zeebe:input source="=clientId" target="clientId"/>
          <zeebe:input source="=activationCode" target="activationCode"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:sendTask>

    <!-- Task 4: Rejeter la demande (Service Task) -->
    <bpmn:serviceTask id="Task_RejeterDemande" name="Rejeter la demande">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="rejeter-demande" retries="1"/>
        <zeebe:ioMapping>
          <zeebe:input source="=clientId" target="clientId"/>
          <zeebe:input source="=motifRejet" target="motifRejet"/>
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>Flow_Non</bpmn:incoming>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:serviceTask>

    <!-- End Event: Succès -->
    <bpmn:endEvent id="EndEvent_Succes" name="Portabilité activée">
      <bpmn:incoming>Flow_4</bpmn:incoming>
    </bpmn:endEvent>

    <!-- End Event: Rejet -->
    <bpmn:endEvent id="EndEvent_Rejet" name="Demande rejetée">
      <bpmn:incoming>Flow_5</bpmn:incoming>
    </bpmn:endEvent>

    <!-- Sequence Flows -->
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_VerifierEligibilite"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_VerifierEligibilite" targetRef="Gateway_Eligibilite"/>
    <bpmn:sequenceFlow id="Flow_Oui" name="Oui" sourceRef="Gateway_Eligibilite" targetRef="Task_ActiverLigne">
      <bpmn:conditionExpression>=eligible = true</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_Non" name="Non" sourceRef="Gateway_Eligibilite" targetRef="Task_RejeterDemande">
      <bpmn:conditionExpression>=eligible = false</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_ActiverLigne" targetRef="Task_NotifierClient"/>
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_NotifierClient" targetRef="EndEvent_Succes"/>
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_RejeterDemande" targetRef="EndEvent_Rejet"/>

  </bpmn:process>

  <!-- Diagramme -->
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_Portabilite">

      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="232" width="36" height="36"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="126" y="275" width="89" height="27"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="Task_VerifierEligibilite_di" bpmnElement="Task_VerifierEligibilite">
        <dc:Bounds x="250" y="210" width="100" height="80"/>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="Gateway_Eligibilite_di" bpmnElement="Gateway_Eligibilite" isMarkerVisible="true">
        <dc:Bounds x="415" y="225" width="50" height="50"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="398" y="282" width="85" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="Task_ActiverLigne_di" bpmnElement="Task_ActiverLigne">
        <dc:Bounds x="530" y="210" width="100" height="80"/>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="Task_NotifierClient_di" bpmnElement="Task_NotifierClient">
        <dc:Bounds x="700" y="210" width="100" height="80"/>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="Task_RejeterDemande_di" bpmnElement="Task_RejeterDemande">
        <dc:Bounds x="530" y="360" width="100" height="80"/>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="EndEvent_Succes_di" bpmnElement="EndEvent_Succes">
        <dc:Bounds x="872" y="232" width="36" height="36"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="848" y="275" width="84" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="EndEvent_Rejet_di" bpmnElement="EndEvent_Rejet">
        <dc:Bounds x="872" y="382" width="36" height="36"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="851" y="425" width="79" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <!-- Flows DI -->
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="250"/>
        <di:waypoint x="250" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="350" y="250"/>
        <di:waypoint x="415" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Oui_di" bpmnElement="Flow_Oui">
        <di:waypoint x="465" y="250"/>
        <di:waypoint x="530" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Non_di" bpmnElement="Flow_Non">
        <di:waypoint x="440" y="275"/>
        <di:waypoint x="440" y="400"/>
        <di:waypoint x="530" y="400"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="630" y="250"/>
        <di:waypoint x="700" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="800" y="250"/>
        <di:waypoint x="872" y="250"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5">
        <di:waypoint x="630" y="400"/>
        <di:waypoint x="872" y="400"/>
      </bpmndi:BPMNEdge>

    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}
}