import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="page-wrapper">

      <!-- ============== HERO ============== -->
      <section class="hero">
        <img class="hero-bg" src="assets/page-about.png" alt="" aria-hidden="true" />
        <div class="hero-overlay"></div>

        <div class="hero-content">
          <span class="hero-badge">Generation BPMN par IA</span>

          <h1 class="hero-title">
            Transformez vos processus telecom<br />
            en diagrammes BPMN
          </h1>

          <p class="hero-subtitle">
            Decrivez votre processus en langage naturel et obtenez un diagramme BPMN exploitable,
            pret a etre deploye sur Camunda, en quelques secondes.
          </p>

          <div class="hero-actions">
            <button mat-flat-button class="btn-primary" routerLink="/login">
              Essayer maintenant
            </button>
          </div>

          <!-- Comment ça marche, intégré au hero -->
          <div class="steps">
            <div class="step" *ngFor="let step of steps; let last = last">
              <div class="step-content">
                <div class="step-badge">{{ step.number }}</div>
                <div class="step-icon">
                  <mat-icon>{{ step.icon }}</mat-icon>
                </div>
                <p class="step-title">{{ step.title }}</p>
                <p class="step-subtitle">{{ step.subtitle }}</p>
              </div>
              <div class="step-divider" *ngIf="!last"></div>
            </div>
          </div>

          <!-- Avertissement, intégré au hero -->
          <div class="notice">
            <mat-icon>lightbulb</mat-icon>
            <p>
              L'application est en évolution continue. Certains cas complexes (boucles imbriquées,
              pools multiples) peuvent nécessiter des ajustements manuels.
            </p>
          </div>
        </div>
      </section>

    </div>
  `,
  styles: [
    `
      .page-wrapper {
        background: #f4f6fb;
        min-height: calc(100vh - 64px);
      }

      /* ============== HERO ============== */
      .hero {
        position: relative;
        overflow: hidden;
        min-height: 100vh;
        padding: 24px 24px 56px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .hero-bg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .hero-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          180deg,
          rgba(6, 10, 26, 0.88) 0%,
          rgba(10, 16, 38, 0.82) 55%,
          rgba(14, 22, 48, 0.9) 100%
        );
      }

      .hero-content {
        position: relative;
        z-index: 1;
        max-width: 880px;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .hero-badge {
        display: inline-block;
        padding: 7px 16px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: #cdd6ff;
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 24px;
      }

      .hero-title {
        margin: 0 0 20px;
        font-size: 46px;
        font-weight: 800;
        line-height: 1.2;
        color: #ffffff;
      }

      .hero-subtitle {
        margin: 0 0 32px;
        max-width: 620px;
        font-size: 16px;
        line-height: 1.7;
        color: rgba(255, 255, 255, 0.78);
      }

      .hero-actions {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 56px;
      }

      .btn-primary {
        background: #ffffff;
        color: #0b1f4b;
        padding: 0 26px;
        height: 46px;
        border-radius: 999px;
        font-size: 15px;
        font-weight: 600;
      }

      .btn-secondary {
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.35);
        padding: 0 26px;
        height: 46px;
        border-radius: 999px;
        font-size: 15px;
        font-weight: 500;
      }

      /* Steps inside hero */
      .steps {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        width: 100%;
        max-width: 760px;
      }

      .step {
        display: flex;
        align-items: center;
        flex: 1;
      }

      .step-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        width: 140px;
        position: relative;
      }

      .step-badge {
        position: absolute;
        top: -6px;
        left: 50%;
        transform: translateX(8px);
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #ffffff;
        color: #0b1f4b;
        font-size: 12px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
      }

      .step-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.18);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14px;
      }

      .step-icon mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: #ffffff;
      }

      .step-title {
        margin: 0 0 4px;
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
      }

      .step-subtitle {
        margin: 0;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .step-divider {
        flex: 1 1 40px;
        height: 0;
        border-top: 2px dashed rgba(255, 255, 255, 0.22);
        margin: 0 4px;
        align-self: center;
        margin-top: -32px;
      }

      /* Notice — intégrée au hero, sur fond sombre */
     /* APRÈS */
      .notice {
       display: flex;
       align-items: center;
       gap: 18px;
       background: rgba(255, 255, 255, 0.08);
       border: 1px solid rgba(255, 255, 255, 0.18);
       border-radius: 12px;
       padding: 16px 22px;
       margin-top: 130px;
       max-width: 100%;
       width: max-content;
     }

      .notice mat-icon {
        color: #fbbf24;
        font-size: 20px;
        width: 20px;
        height: 20px;
        margin-top: 2px;
        flex-shrink: 0;
      }

      .notice p {
        margin: 0;
        font-size: 13px;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.8);
        text-align: left;
        white-space: nowrap;
      }

      /* ============== RESPONSIVE ============== */
      @media (max-width: 768px) {
        .hero {
          min-height: auto;
          padding: 64px 20px 40px;
        }

        .hero-title {
          font-size: 30px;
        }

        .hero-subtitle {
          font-size: 14px;
        }

        .hero-actions {
          flex-direction: column;
          width: 100%;
          gap: 10px;
        }

        .btn-primary,
        .btn-secondary {
          width: 100%;
        }

        .steps {
          flex-direction: column;
          gap: 24px;
          max-width: 100%;
        }

        .step-divider {
          display: none;
        }

        .notice {
          margin-top: 32px;
          max-width: 100%;
        }
      }
    `
  ]
})
export class AboutComponent {
  readonly steps = [
    { number: 1, icon: 'chat_bubble_outline', title: 'Décrivez', subtitle: 'en langage naturel' },
    { number: 2, icon: 'auto_fix_high', title: 'Génération', subtitle: 'diagramme BPMN' },
    { number: 3, icon: 'visibility', title: 'Visualisez', subtitle: 'et ajustez' },
    { number: 4, icon: 'rocket_launch', title: 'Déployez', subtitle: 'sur Camunda' }
  ];
}