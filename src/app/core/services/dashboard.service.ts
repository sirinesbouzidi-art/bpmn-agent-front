import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type DashboardProcessStatus = 'Generated' | 'Validated' | 'Draft' | string;
export type DashboardSystemState = 'online' | 'offline' | 'degraded' | string;

export interface DashboardProcess {
  process?: string;
  processName?: string;
  name?: string;
  author?: string;
  createdBy?: string;
  status?: DashboardProcessStatus;
  date?: string;
  generationDate?: string;
  createdAt?: string;
}

export interface DashboardActivity {
  icon?: string;
  title?: string;
  actor?: string;
  action?: string;
  time?: string;
  createdAt?: string;
}

export interface DashboardSystemStatusItem {
  label?: string;
  value?: string;
  status?: DashboardSystemState;
  icon?: string;
}

export interface DashboardSystemStatus {
  backend?: DashboardSystemStatusItem | DashboardSystemState;
  fastApi?: DashboardSystemStatusItem | DashboardSystemState;
  fastAPI?: DashboardSystemStatusItem | DashboardSystemState;
  database?: DashboardSystemStatusItem | DashboardSystemState;
  camunda?: DashboardSystemStatusItem | DashboardSystemState;
  [key: string]: DashboardSystemStatusItem | DashboardSystemState | undefined;
}

export interface AdminDashboardResponse {
  totalUsers: number;
  totalAdmins: number;
  totalStandardUsers: number;
  generatedModels: number;
  generatedToday?: number;
  generationPerDay: number[];
  latestProcesses: DashboardProcess[];
  recentActivities: DashboardActivity[];
  systemStatus: DashboardSystemStatus;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = 'http://localhost:8080/api/admin/dashboard';

  constructor(private readonly http: HttpClient) {}

  getDashboard(): Observable<AdminDashboardResponse> {
    return this.http.get<AdminDashboardResponse>(this.apiUrl);
  }
}