import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, OnDestroy, OnInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import lintingModule from '@camunda/linting/modeler';
import { BpmnService } from '../../core/services/bpmn.service';
import { HistoryService } from '../../core/services/history.service';
import { BpmnLintingService, LintReport } from '../../core/services/bpmn-linting.service';
import { BpmnModel } from '../../shared/models/bpmn.model';


@Component({
  selector: 'app-validation',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <div class="validation-page" *ngIf="model() as m">
      <header class="page-header">
        <div>
          <h2>Validation BPMN — {{ m.name }}</h2>
          <p class="subtitle">Vérification des règles BPMN 2.0 et de compatibilité Camunda 8 avant déploiement</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="runValidation()" [disabled]="isRevalidating">
            <mat-icon>refresh</mat-icon> Revalider
          </button>
          <button mat-flat-button color="primary" (click)="proceedToDeploy()" [disabled]="isDeploying">
            <mat-icon>rocket_launch</mat-icon> {{ isDeploying ? 'Déploiement...' : 'Déployer' }}
          </button>
        </div>
      </header>

      <section class="diagram-section">
        <div class="diagram-toolbar">
          <button mat-icon-button (click)="resetZoom()" matTooltip="Ajuster à la vue"><mat-icon>center_focus_strong</mat-icon></button>
        </div>
        <div #canvas class="canvas"></div>
      </section>

      <section class="defects-section">
        <div class="defects-summary">
          <span class="badge error" *ngIf="errorCount() > 0">{{ errorCount() }} erreur(s)</span>
          <span class="badge warn" *ngIf="warningCount() > 0">{{ warningCount() }} avertissement(s)</span>
          <span class="badge ok" *ngIf="reports().length === 0">Aucun défaut détecté</span>
        </div>

        <div class="table-wrapper" *ngIf="reports().length > 0">
          <table class="defects-table">
            <thead>
              <tr><th></th><th>Règle</th><th>Élément</th><th>Message</th><th></th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of reports()" [class.error]="r.category === 'error'" [class.warn]="r.category === 'warn'">
                <td><mat-icon class="severity-icon">{{ r.category === 'error' ? 'error' : 'warning' }}</mat-icon></td>
                <td>{{ r.label }}</td>
                <td><code>{{ r.id }}</code></td>
                <td>{{ r.message }}</td>
                <td>
                  <button mat-icon-button (click)="selectRow(r)" matTooltip="Localiser sur le diagramme">
                    <mat-icon>my_location</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="empty-text" *ngIf="reports().length === 0 && !isRevalidating">
          Ce diagramme respecte les règles BPMN 2.0 et les contraintes Camunda 8 / Zeebe.
        </p>
      </section>
    </div>
  `,
  styles: [`
    .validation-page {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 64px);
      padding: 20px 24px;
      gap: 16px;
      background: #f8fafc;
      box-sizing: border-box;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 12px;
    }

    .page-header h2 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #0f172a; }
    .subtitle { margin: 0; font-size: 13px; color: #64748b; }

    .header-actions { display: flex; gap: 8px; }
    .header-actions button[mat-flat-button] {
      background: linear-gradient(90deg, #4f46e5, #7c3aed);
      color: #fff;
    }

    .diagram-section {
      flex: 0 0 55%;
      position: relative;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      min-height: 280px;
    }

    .diagram-toolbar {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 10;
    }

    .canvas { width: 100%; height: 100%; }

    .defects-section {
      flex: 1;
      min-height: 0;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: hidden;
    }

    .defects-summary { display: flex; gap: 10px; flex-shrink: 0; }

    .badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge.error { background: #fee2e2; color: #b91c1c; }
    .badge.warn { background: #fef3c7; color: #92400e; }
    .badge.ok { background: #dcfce7; color: #166534; }

    .table-wrapper { flex: 1; overflow-y: auto; }

    .defects-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .defects-table th {
      text-align: left;
      padding: 8px 10px;
      color: #64748b;
      font-weight: 600;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      background: white;
    }
    .defects-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .defects-table tr.error .severity-icon { color: #ef4444; }
    .defects-table tr.warn .severity-icon { color: #f59e0b; }
    .defects-table code { font-size: 12px; color: #475569; }

    .empty-text { margin: 0; color: #64748b; font-size: 14px; }
  `]
})
export class ValidationComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef?: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bpmnService = inject(BpmnService);
  private readonly historyService = inject(HistoryService);
  private readonly lintingService = inject(BpmnLintingService);
  private readonly snackBar = inject(MatSnackBar);

  model = signal<BpmnModel | null>(null);
  reports = this.lintingService.reports;
  errorCount = computed(() => this.reports().filter(r => r.category === 'error').length);
  warningCount = computed(() => this.reports().filter(r => r.category === 'warn').length);
  isRevalidating = false;
  isDeploying = false;

  private modeler?: BpmnModeler;

  // ✅ ngOnInit : résolution du modèle AVANT que la vue se construise
  // → le *ngIf="model() as m" devient true → le canvas est rendu
  // → canvasRef est défini quand ngAfterViewInit s'exécute
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    // bpmnService.currentModel() en premier : vient d'être setté dans home avant la navigation
    const fromService = this.bpmnService.currentModel();

    // history en fallback : utile si on arrive depuis history.component
    const fromHistory = id
      ? this.historyService.getHistory().find((m: BpmnModel) => m.id === id) ?? null
      : null;

    const target = fromService || fromHistory;

    if (!target) {
      this.snackBar.open('Aucun diagramme à valider.', 'Fermer', { duration: 3000 });
      this.router.navigate(['/home']);
      return;
    }

    this.model.set(target);
  }

  async ngAfterViewInit(): Promise<void> {
    // model() est déjà résolu dans ngOnInit, le canvas est dans le DOM
    if (!this.model() || !this.canvasRef) return;

    this.modeler = new BpmnModeler({
      container: this.canvasRef.nativeElement,
      additionalModules: [lintingModule]
    });

    await this.modeler.importXML(this.model()!.xml);
    this.resetZoom();
    await this.runValidation();
  }

  ngOnDestroy(): void {
    this.modeler?.destroy();
    this.lintingService.clear();
  }

  async runValidation(): Promise<void> {
  if (!this.modeler || this.isRevalidating) return;
  this.isRevalidating = true;
  try {
    const result = (await this.modeler.saveXML({ format: true })) as { xml: string };
    await this.lintingService.lint(this.modeler, result.xml);
  } catch (e) {
    console.error('[Validation] Erreur lors du lint :', e);
    this.snackBar.open('Erreur lors de la validation. Vérifiez la console.', 'Fermer', { duration: 3000 });
  } finally {
    this.isRevalidating = false; // toujours débloqué, même en cas d'erreur
  }
}

  resetZoom(): void {
    const canvas = this.modeler?.get('canvas') as { zoom: (mode: 'fit-viewport') => void };
    canvas?.zoom('fit-viewport');
  }

  selectRow(report: LintReport): void {
    if (this.modeler) this.lintingService.selectElement(this.modeler, report.id);
  }

  async proceedToDeploy(): Promise<void> {
    if (this.lintingService.hasBlockingErrors()) {
      this.snackBar.open('Corrigez les erreurs bloquantes avant de déployer.', 'Fermer', { duration: 3000 });
      return;
    }

    const current = this.model();
    if (!current || !this.modeler) return;

    this.isDeploying = true;
    const result = (await this.modeler.saveXML({ format: true })) as { xml: string };

    this.bpmnService.deployXml(result.xml)
      .pipe(finalize(() => (this.isDeploying = false)))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.snackBar.open(response.message || 'Déploiement échoué', 'Fermer', { duration: 3000 });
            return;
          }
          this.snackBar.open('Processus déployé avec succès.', 'Fermer', { duration: 3000 });
          setTimeout(() => window.open('http://localhost:8081', '_blank'), 1000);
        },
        error: () => this.snackBar.open('Déploiement échoué. Veuillez réessayer.', 'Fermer', { duration: 3000 })
      });
  }
}