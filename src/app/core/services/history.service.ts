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
  }

  getHistory(): BpmnModel[] {
    return this.history();
  }
  getById(id: string): BpmnModel | undefined {
    return this.history().find(model => model.id === id);
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
  updateHistoryItem(id: string, updates: Partial<BpmnModel>): void {
    const updatedHistory = this.history().map(model => {
      if (model.id !== id) {
        return model;
      }

      return {
        ...model,
        ...updates
      };
    });

    this.history.set(updatedHistory);
    this.historySubject.next(updatedHistory);
    this.saveToLocalStorage();
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
        const parsed = (JSON.parse(saved) as Array<BpmnModel & { createdAt?: string }>).map(item => ({
        ...item,
        xml: item.xml || '',
        date: new Date(item.date ?? item.createdAt ?? new Date().toISOString())
      }));
        this.history.set(parsed);
        this.historySubject.next(parsed);
        console.log('📦 History loaded:', this.history().length, 'items');
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }
}