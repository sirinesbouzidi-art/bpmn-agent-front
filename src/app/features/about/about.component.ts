import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div class="page-container">
      <mat-card class="content-card about-card">
        <h1>À propos de BPMN Telecom Studio</h1>
        <p>
          Cette application aide les équipes métier et techniques à transformer une description textuelle d’un
          processus télécom en diagramme BPMN exploitable.
        </p>

        <section class="section">
          <h2>Pourquoi utiliser cette application ?</h2>
          <ul>
            <li>
              <mat-icon>bolt</mat-icon>
              <span>Accélérer la modélisation des processus à partir d’un simple prompt en langage naturel.</span>
            </li>
            <li>
              <mat-icon>groups</mat-icon>
              <span>Faciliter l’alignement entre équipes produit, opérations et support autour d’un même workflow.</span>
            </li>
            <li>
              <mat-icon>visibility</mat-icon>
              <span>Visualiser rapidement les étapes clés avant industrialisation dans vos outils internes.</span>
            </li>
          </ul>
        </section>

        <section class="section">
          <h2>Fonctionnalités principales</h2>
          <ul>
            <li>Génération BPMN assistée à partir d’une description métier.</li>
            <li>Visualisation du diagramme généré dans un viewer intégré.</li>
            <li>Historique des modèles récents pour reprendre vos travaux.</li>
          </ul>
        </section>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .about-card {
        max-width: 900px;
        margin: 48px auto;
      }

      .section {
        margin-top: 24px;
      }

      h1,
      h2 {
        color: #0b2a5b;
      }

      ul {
        padding-left: 20px;
        margin: 0;
      }

      li {
        margin-bottom: 10px;
      }

      .section:first-of-type ul {
        list-style: none;
        padding-left: 0;
      }

      .section:first-of-type li {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      mat-icon {
        color: #0b2a5b;
        margin-top: 2px;
      }
    `
  ]
})
export class AboutComponent {}