import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BpmnModel } from '../../shared/models/bpmn.model';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly STORAGE_KEY = 'bpmn_history';
  private history = signal<BpmnModel[]>([]);
  
  private historySubject = new BehaviorSubject<BpmnModel[]>([]);
  readonly history$ = this.historySubject.asObservable();

  constructor() {
    this.loadFromLocalStorage();
    
    if (this.history().length === 0) {
      this.initializeMockData();
    }
  }

  private initializeMockData(): void {
    const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
      <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
        xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
        xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
        xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
        id="Definitions_1"
        targetNamespace="http://bpmn.io/schema/bpmn">
        <bpmn:process id="Process_1" isExecutable="false">
          <bpmn:startEvent id="StartEvent_1" name="Start"/>
          <bpmn:task id="Task_1" name="Process Task"/>
          <bpmn:endEvent id="EndEvent_1" name="End"/>
        </bpmn:process>
        <bpmndi:BPMNDiagram id="BPMNDiagram_1">
          <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1"/>
        </bpmndi:BPMNDiagram>
      </bpmn:definitions>`;

    const mockModels: BpmnModel[] = [
      {
        id: 'mock-1',
        name: 'Portabilité Client',
        description: 'Vérification éligibilité puis activation ligne.',
        createdAt: '2026-01-05T10:00:00.000Z',
        status: 'Validated',
        xml: mockXml
      },
      {
        id: 'mock-2',
        name: 'Gestion Échec Paiement',
        description: 'Notification client et suspension de service.',
        createdAt: '2026-01-12T10:00:00.000Z',
        status: 'Generated',
        xml: mockXml
      },
      {
        id: 'mock-3',
        name: 'Assignation Incident N1',
        description: 'Assignation automatique au support niveau 1.',
        createdAt: '2026-01-18T10:00:00.000Z',
        status: 'Draft',
        xml: mockXml
      }
    ];

    this.history.set(mockModels);
    this.historySubject.next(mockModels);
    this.saveToLocalStorage();
  }

  getHistory(): BpmnModel[] {
    return this.history();
  }

  addToHistory(model: BpmnModel): void {
    const currentHistory = this.history();
    
    if (!currentHistory.some(m => m.id === model.id)) {
      const updatedHistory = [model, ...currentHistory];
      this.history.set(updatedHistory);
      this.historySubject.next(updatedHistory);
      this.saveToLocalStorage();
      console.log('✅ Model added to history:', model.name);
    }
  }

  removeFromHistory(id: string): void {
    const updatedHistory = this.history().filter(model => model.id !== id);
    this.history.set(updatedHistory);
    this.historySubject.next(updatedHistory);
    this.saveToLocalStorage();
    console.log('🗑️ Model removed from history');
  }

  clearHistory(): void {
    this.history.set([]);
    this.historySubject.next([]);
    this.saveToLocalStorage();
    console.log('🧹 History cleared');
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.history()));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.history.set(parsed);
        this.historySubject.next(parsed);
        console.log('📦 History loaded:', this.history().length, 'items');
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }
}