import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BpmnService } from '../../core/services/bpmn.service';
import { BpmnModel } from '../../shared/models/bpmn.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <mat-card class="content-card home-card">
         <div class="hero">
          <span class="tag">AI powered BPMN</span>
          <h1>Describe your telecom process</h1>
          <p>Generate BPMN automatically from natural language.</p>
        </div>

        <div class="examples">
          <button mat-stroked-button type="button" *ngFor="let example of examples" (click)="selectExample(example)">
            {{ example }}
          </button>
        </div>

        <form [formGroup]="promptForm" (ngSubmit)="generate()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Process description</mat-label>
            <textarea matInput rows="6" formControlName="prompt"></textarea>
            <mat-hint align="end">{{ promptForm.controls.prompt.value.length }}/20 min</mat-hint>
            <mat-error *ngIf="promptForm.controls.prompt.invalid">Minimum 20 characters required.</mat-error>
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" [disabled]="promptForm.invalid || isLoading">
            Generate BPMN
          </button>

          <div class="loader" *ngIf="isLoading">
            <mat-spinner diameter="36"></mat-spinner>
            <span>Generating model...</span>
          </div>
        </form>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .home-card {
         max-width: 1180px;
        margin: 36px auto;
      }

      .hero {
        margin-bottom: 18px;
      }

      .tag {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.4px;
        color: #4338ca;
        background: #e8eaff;
      }

      h1 {
        margin: 12px 0 6px;
        font-size: clamp(32px, 4vw, 52px);
        line-height: 1.05;
      }

      p {
        margin: 0;
        color: #62708f;
      }

      .examples {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 14px;
        margin: 20px 0 24px;
      }

      .examples button {
        min-height: 72px;
        white-space: normal;
        line-height: 1.4;
        padding: 12px 18px;
      }

      .full-width {
        width: 100%;
      }

      form {
        display: grid;
        gap: 16px;
      }
        textarea {
        min-height: 180px;
      }

      button[mat-flat-button] {
        width: fit-content;
        min-width: 220px;
        min-height: 48px;
        border-radius: 12px;
        font-weight: 600;
      }

      .loader {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        color: #546274;
      }
         @media (max-width: 900px) {
        .examples {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class HomeComponent {
  private readonly fb = inject(FormBuilder);
  private readonly bpmnService = inject(BpmnService);
  private readonly router = inject(Router);

  isLoading = false;

  readonly examples: string[] = [
    'Lorsqu’un client demande une portabilité, vérifier son éligibilité puis activer la ligne.',
    'Si le paiement échoue, envoyer une notification et suspendre le service.',
    'Lorsqu’un ticket incident est créé, assigner au support niveau 1.'
  ];

  readonly promptForm = this.fb.nonNullable.group({
    prompt: ['', [Validators.required, Validators.minLength(20)]]
  });

  selectExample(example: string): void {
    this.promptForm.patchValue({ prompt: example });
    this.promptForm.markAsDirty();
  }

  generate(): void {
    if (this.promptForm.invalid) {
      this.promptForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    setTimeout(() => {
      const model: BpmnModel = {
        id: crypto.randomUUID(),
        name: 'Generated Telecom Process',
        description: this.promptForm.controls.prompt.value,
        createdAt: new Date().toISOString(),
        status: 'Generated',
        xml: this.mockXml()
      };

      this.bpmnService.setCurrentModel(model);
      this.isLoading = false;
      this.router.navigate(['/viewer']);
    }, 2000);
  }

  private mockXml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
      <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
        xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
        xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
        id="Definitions_1"
        targetNamespace="http://bpmn.io/schema/bpmn">
        <bpmn:process id="Process_1" isExecutable="false">
          <bpmn:startEvent id="StartEvent_1" name="Demande"/>
          <bpmn:task id="Task_1" name="Analyse"/>
          <bpmn:endEvent id="EndEvent_1" name="Clôture"/>
          <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/>
          <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1"/>
        </bpmn:process>
        <bpmndi:BPMNDiagram id="BPMNDiagram_1">
          <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1"/>
        </bpmndi:BPMNDiagram>
      </bpmn:definitions>`;
  }
}
