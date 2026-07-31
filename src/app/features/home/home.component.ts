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
        <div class="sidebar-header" *ngIf="!isSidebarCollapsed">
          <div class="header-title">
            <h2>Describe your process <span class="sparkle">✦</span></h2>
            <p>Explain your telecom process in natural language and we'll generate the BPMN diagram for you.</p>
          </div>
          <div class="header-actions">
            <button mat-icon-button routerLink="/history" title="History">
              <mat-icon>history</mat-icon>
              <span class="history-badge" *ngIf="historyCount() > 0">{{ historyCount() }}</span>
            </button>
            <button mat-icon-button (click)="toggleSidebar()" matTooltip="Collapse chat">
              <mat-icon>chevron_left</mat-icon>
            </button>
          </div>
        </div>

        <!-- Contenu du chat (visible uniquement quand déployé) -->
        <div class="chat-content" *ngIf="!isSidebarCollapsed">
          <div class="messages-container" #messagesContainer *ngIf="messages().length > 0">
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
            <div class="textarea-wrapper">
              <textarea
                rows="3"
                [formControl]="promptControl"
                placeholder="Describe your process here..."
              ></textarea>
              <button
                class="send-btn"
                (click)="generate()"
                matTooltip="Send"
              >
                <mat-icon>arrow_upward</mat-icon>
              </button>
            </div>

            <div class="examples-section">
              <p class="examples-label">
                <mat-icon>auto_awesome</mat-icon>
                Example prompts
              </p>
              <div class="examples-list">
                <button type="button" class="example-card" *ngFor="let example of examples" (click)="selectExample(example)">
                  <mat-icon>bolt</mat-icon>
                  <span>{{ example }}</span>
                </button>
              </div>
            </div>

            <button class="generate-btn" (click)="generate()">
              <mat-icon>auto_awesome</mat-icon>
              Generate BPMN
            </button>
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
          <div class="model-info">
            <h3>{{ currentModel()?.name || 'BPMN Diagram' }}</h3>
            <p class="model-subtitle" *ngIf="!currentModel()">Your process diagram will appear here</p>
            <p class="status-badge" *ngIf="currentModel()" [class.generated]="currentModel()?.status === 'Generated'">
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
            <button mat-stroked-button (click)="exportXml()" [disabled]="!currentModel()" matTooltip="Export as XML">
              <mat-icon>description</mat-icon>
              Export XML
            </button>
            <button mat-stroked-button (click)="exportSvg()" [disabled]="!currentModel()" matTooltip="Export as SVG">
              <mat-icon>image</mat-icon>
              Export SVG
            </button>
            <button mat-stroked-button (click)="goToValidation()" [disabled]="!currentModel()" matTooltip="Valider le diagramme">
              <mat-icon>fact_check</mat-icon>
              Validate
            </button>
            <button mat-flat-button (click)="deployCurrentModel()" [disabled]="!currentModel()" matTooltip="Deploy BPMN process" style="background: linear-gradient(90deg, #4f46e5, #7c3aed); color: white; border-radius: 8px;">
              <mat-icon>rocket_launch</mat-icon>
              {{ isDeploying ? 'Deploying...' : 'Deploy BPMN' }}
            </button>
          </div>
        </div>

        <div class="canvas-container">
          <div #canvas class="bpmn-canvas"></div>
          <div class="empty-state" *ngIf="!currentModel() && !isLoading">

  <div class="empty-illustration">

    <svg
      class="bpmn-empty-svg"
      viewBox="0 0 260 260"
      xmlns="http://www.w3.org/2000/svg">

      <!-- Halo -->
      <defs>

        <radialGradient id="bg" cx="50%" cy="50%">
          <stop offset="0%" stop-color="#EEF2FF"/>
          <stop offset="100%" stop-color="#F8FAFF"/>
        </radialGradient>

        <filter id="shadow">
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="10"
            flood-color="#CBD5E1"
            flood-opacity=".45"/>
        </filter>

      </defs>

      <!-- Background -->
      <circle
        cx="130"
        cy="130"
        r="82"
        fill="url(#bg)"/>

      <!-- Connections -->
      <path
        d="M95 95 H130 V130 H172"
        stroke="#C7D2FE"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"/>

      <path
        d="M130 95 V75"
        stroke="#C7D2FE"
        stroke-width="5"
        stroke-linecap="round"/>

      <path
        d="M130 142 V168"
        stroke="#C7D2FE"
        stroke-width="5"
        stroke-linecap="round"/>

      <!-- Top Task -->
      <rect
        x="111"
        y="48"
        width="42"
        height="28"
        rx="7"
        ry="7"
        fill="#8EA4FF"
        filter="url(#shadow)"/>

      <!-- Left Task -->
      <rect
        x="58"
        y="82"
        width="42"
        height="28"
        rx="7"
        ry="7"
        fill="#8EA4FF"
        filter="url(#shadow)"/>

      <!-- Gateway -->
      <rect
        x="118"
        y="118"
        width="24"
        height="24"
        transform="rotate(45 130 130)"
        fill="#8096F8"
        filter="url(#shadow)"/>

      <!-- Bottom Task -->
      <rect
        x="111"
        y="168"
        width="42"
        height="28"
        rx="7"
        ry="7"
        fill="#8EA4FF"
        filter="url(#shadow)"/>

      <!-- End Event -->
      <circle
        cx="188"
        cy="130"
        r="14"
        fill="#8EA4FF"
        filter="url(#shadow)"/>

      <!-- Decorations -->
      <g fill="#D7E3FF">

        <path d="M72 42
                 L75 50
                 L83 53
                 L75 56
                 L72 64
                 L69 56
                 L61 53
                 L69 50Z"/>

        <path d="M190 64
                 L192 70
                 L198 72
                 L192 74
                 L190 80
                 L188 74
                 L182 72
                 L188 70Z"/>

        <circle cx="73" cy="182" r="3"/>
        <circle cx="192" cy="188" r="3"/>
        <circle cx="208" cy="108" r="2"/>
        <circle cx="58" cy="118" r="2"/>

      </g>

    </svg>

  </div>

  <h3>No diagram generated yet</h3>

  <p>
    Describe your process in the chat and click
    <strong>Generate BPMN</strong>
    to get started.
  </p>

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
      width: 420px;
      background: white;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      transition: width 0.3s ease;
      overflow: hidden;
      position: relative;
    }

    .chat-sidebar.collapsed {
      width: 72px;
      align-items: center;
      justify-content: flex-start;
      padding-top: 24px;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 24px 24px 16px;
      background: white;
    }

    .header-title h2 {
      margin: 0 0 8px;
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
    }

    .header-title .sparkle {
      color: #f4c9c0;
    }

    .header-title p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: #64748b;
    }

    .header-actions {
      display: flex;
      gap: 4px;
      align-items: center;
      position: relative;
      flex-shrink: 0;
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
      gap: 8px;
      position: relative;
    }

    .mini-chat-btn {
      background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
      color: white !important;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
    }

    .mini-chat-btn mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .mini-history-badge {
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      font-size: 11px;
      font-weight: 600;
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
      padding: 0 24px 24px;
    }

    .messages-container {
      flex: 0 0 auto;
      max-height: 240px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 16px;
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
      background: #1a1a4d;
      color: white;
    }

    .message.assistant .message-avatar {
      background: #f1f5f9;
      color: #1a1a4d;
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
      background: #1a1a4d;
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
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .textarea-wrapper {
      position: relative;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: white;
    }

    .textarea-wrapper textarea {
      width: 100%;
      min-height: 140px;
      border: none;
      outline: none;
      resize: none;
      padding: 14px 52px 14px 14px;
      font-size: 14px;
      font-family: inherit;
      border-radius: 14px;
      box-sizing: border-box;
    }

    .send-btn {
      position: absolute;
      bottom: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .send-btn:disabled {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .send-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .examples-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .examples-label {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
    }

    .examples-label mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #f4c9c0;
    }

    .examples-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .example-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      text-align: left;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 13px;
      line-height: 1.5;
      color: #334155;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .example-card:hover {
      background: #eef0fa;
      border-color: #1a1a4d;
    }

    .example-card mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #1a1a4d;
      margin-top: 1px;
      flex-shrink: 0;
    }

    .generate-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 48px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(90deg, #4f46e5, #7c3aed);
      color: #ffffff;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
    }

    .generate-btn:disabled {
      background: linear-gradient(90deg, #4f46e5, #7c3aed);
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Canvas area */
    .canvas-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
      padding: 20px 20px 0;
      gap: 16px;
    }

    .canvas-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 12px;
    }

    .model-info h3 {
      margin: 0 0 4px;
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
    }

    .model-subtitle {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      background: #e2e8f0;
      color: #475569;
      margin: 0;
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

    .canvas-container {
      flex: 1;
      position: relative;
      background: white;
      margin: 0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
      background-image: radial-gradient(circle, #e8eaf0 1px, transparent 1px);
      background-size: 18px 18px;
    }

    .bpmn-canvas {
      width: 100%;
      height: 100%;
    }

    .empty-state {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      max-width: 360px;
    }

    .empty-illustration{
    display:flex;
    justify-content:center;
    align-items:center;
    width:260px;
    height:260px;
    margin:0 auto 28px;
    }
    .bpmn-empty-svg{
    width:260px;
    height:260px;
    transition:.35s ease;
}
.empty-state:hover .bpmn-empty-svg{
    transform:translateY(-3px) scale(1.02);
    }
    .empty-state h3 {
      margin: 0 0 8px;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
    }

    .empty-state strong {
      color: #4f46e5;
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
        padding: 12px 12px 0;
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
  currentBpmnJson: any = null;

  readonly examples: string[] = [
    'Lorsqu\'un client demande une portabilité, vérifier son éligibilité puis activer la ligne.',
    'Lorsqu\'une commande est passée, valider le paiement et traiter la commande.',
    'Lorsqu\'un abonnement expire, envoyer une notification de renouvellement au client.'
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

  goToValidation(): void {
  const model = this.currentModel();
  if (model) this.router.navigate(['/validation', model.id]);
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

  const currentBpmn = this.currentBpmnJson;

  this.bpmnService.generateBpmn(userMessage, currentBpmn).subscribe({
    next: async (xml: string) => {
      const model: BpmnModel = {
        id: this.currentModel()?.id || crypto.randomUUID(),
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
      this.currentBpmnJson = this.bpmnService.lastBpmnJson; // ← stocker le JSON
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