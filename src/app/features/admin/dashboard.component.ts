import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EMPTY, Subscription, catchError, interval, startWith, switchMap } from 'rxjs';
import { AdminDashboardResponse, DashboardActivity, DashboardProcess, DashboardService, DashboardSystemStatusItem, DashboardSystemState } from '../../core/services/dashboard.service';

type StatTone = 'blue' | 'purple' | 'cyan' | 'green';
type ProcessStatus = 'Generated' | 'Validated' | 'Draft' | string;

type StatCard = {
  icon: string;
  title: string;
  value: string;
  footer: string;
  tone: StatTone;
};

type ActivityBar = {
  day: string;
  value: number;
  label: string;
};

type ProcessRow = {
  process: string;
  author: string;
  status: ProcessStatus;
  date: string;
};

type TimelineItem = {
  icon: string;
  title: string;
  time: string;
};

type QuickAction = {
  icon: string;
  label: string;
  route: string;
};

type SystemStatus = {
  label: string;
  value: string;
  icon: string;
  online: boolean;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="dashboard-shell">
      <div class="dashboard-container">
        <header class="hero-panel reveal-card">
          <div class="hero-copy">
            <div class="eyebrow">
              <span class="pulse-dot"></span>
              Real-time platform overview
            </div>
            <h1>Dashboard</h1>
            <p class="welcome">Welcome back Administrator 👋</p>
            <p class="hero-subtitle">Monitor BPMN Telecom Studio platform in real time.</p>
          </div>

          <div class="hero-actions">
            <button class="soft-action" type="button">
              <mat-icon>calendar_today</mat-icon>
              Today
            </button>
            <button class="primary-action" type="button" (click)="refreshDashboard()">
              <mat-icon>refresh</mat-icon>
              Refresh
            </button>
          </div>
        </header>

        <div class="stats-grid">
          <article class="stat-card reveal-card" *ngFor="let stat of stats()" [ngClass]="'tone-' + stat.tone">
            <div class="stat-topline">
              <div class="stat-icon">
                <mat-icon>{{ stat.icon }}</mat-icon>
              </div>
              <span class="trend-pill">Live</span>
            </div>
            <p class="stat-title">{{ stat.title }}</p>
            <h2>{{ stat.value }}</h2>
            <p class="stat-footer">{{ stat.footer }}</p>
          </article>
        </div>

        <div class="insights-grid">
          <article class="panel chart-panel reveal-card">
            <div class="panel-heading">
              <div>
                <h2>BPMN Generation Activity</h2>
                <p>Last seven days</p>
              </div>
              <div class="panel-icon">
                <mat-icon>stacked_bar_chart</mat-icon>
              </div>
            </div>

            <div class="bar-chart" aria-label="BPMN generation activity over the last seven days">
              <div class="bar-column" *ngFor="let bar of activityBars(); let index = index">
                <div class="bar-track">
                  <div class="bar-fill" [style.height.%]="bar.value" [style.animation-delay.ms]="index * 80"></div>
                </div>
                <span class="bar-value">{{ bar.label }}</span>
                <span class="bar-day">{{ bar.day }}</span>
              </div>
            </div>
          </article>

          <article class="panel distribution-panel reveal-card">
            <div class="panel-heading compact">
              <div>
                <h2>User Distribution</h2>
                <p>Role split</p>
              </div>
              <div class="panel-icon purple">
                <mat-icon>donut_large</mat-icon>
              </div>
            </div>

            <div class="donut-wrap">
              <div class="donut-chart" [style.background]="donutBackground()">
                <div class="donut-hole">
                  <strong>{{ totalUsers() }}</strong>
                  <span>Users</span>
                </div>
              </div>
            </div>

            <div class="legend-list">
              <div class="legend-item admin">
                <span class="legend-dot"></span>
                <div>
                  <p>Administrators</p>
                  <strong>{{ totalAdmins() }}</strong>
                </div>
              </div>
              <div class="legend-item user">
                <span class="legend-dot"></span>
                <div>
                  <p>Standard Users</p>
                  <strong>{{ totalStandardUsers() }}</strong>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      color: #111827;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .dashboard-shell {
      min-height: calc(100vh - 64px);
      background:
        radial-gradient(circle at top left, rgba(79, 70, 229, 0.12), transparent 34rem),
        linear-gradient(180deg, #f6f8fc 0%, #eef2ff 100%);
      padding: 32px 24px 64px;
    }

    .dashboard-container {
      width: 100%;
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .reveal-card {
      animation: fadeUp 0.6s ease both;
    }

    .hero-panel,
    .panel,
    .stat-card {
      border: 1px solid rgba(229, 231, 235, 0.88);
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
      backdrop-filter: blur(20px);
    }

    .hero-panel {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      border-radius: 28px;
      padding: 32px;
      overflow: hidden;
      position: relative;
    }

    .hero-panel::after {
      content: '';
      position: absolute;
      width: 280px;
      height: 280px;
      right: -80px;
      top: -120px;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(79, 70, 229, 0.18), rgba(99, 102, 241, 0.04));
      pointer-events: none;
    }

    .hero-copy,
    .hero-actions {
      position: relative;
      z-index: 1;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      padding: 8px 12px;
      border-radius: 999px;
      background: #eef2ff;
      color: #4f46e5;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .pulse-dot,
    .all-online span,
    .online-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #22c55e;
      box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.14);
    }

    h1,
    h2,
    p {
      margin: 0;
    }

    .hero-copy h1 {
      font-size: clamp(38px, 5vw, 64px);
      line-height: 0.95;
      letter-spacing: -0.06em;
      color: #111827;
      margin-bottom: 16px;
      font-weight: 850;
    }

    .welcome {
      color: #312e81;
      font-size: 20px;
      font-weight: 750;
      margin-bottom: 6px;
    }

    .hero-subtitle,
    .panel-heading p,
    .stat-footer,
    .legend-item p,
    .system-card p {
      color: #64748b;
    }

    .hero-subtitle {
      font-size: 15px;
    }

    .hero-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    button {
      font-family: inherit;
    }

    .soft-action,
    .primary-action,
    .ghost-action,
    .quick-action {
      border: 0;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-weight: 750;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }

    .soft-action,
    .primary-action,
    .ghost-action {
      height: 46px;
      padding: 0 18px;
      border-radius: 14px;
      font-size: 14px;
    }

    .soft-action,
    .ghost-action {
      color: #312e81;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
    }

    .primary-action {
      color: #ffffff;
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      box-shadow: 0 14px 26px rgba(79, 70, 229, 0.28);
    }

    .soft-action:hover,
    .primary-action:hover,
    .ghost-action:hover,
    .quick-action:hover {
      transform: translateY(-3px);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 20px;
    }

    .stat-card {
      border-radius: 24px;
      padding: 22px;
      overflow: hidden;
      position: relative;
      transition: transform 0.24s ease, box-shadow 0.24s ease;
    }

    .stat-card:hover,
    .panel:hover {
      transform: translateY(-4px);
      box-shadow: 0 24px 55px rgba(15, 23, 42, 0.12);
    }

    .stat-card::before {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0.11;
      pointer-events: none;
    }

    .tone-blue::before { background: linear-gradient(135deg, #2563eb, transparent 62%); }
    .tone-purple::before { background: linear-gradient(135deg, #7c3aed, transparent 62%); }
    .tone-cyan::before { background: linear-gradient(135deg, #06b6d4, transparent 62%); }
    .tone-green::before { background: linear-gradient(135deg, #22c55e, transparent 62%); }

    .stat-topline,
    .panel-heading,
    .process-cell,
    .legend-item,
    .system-card {
      display: flex;
      align-items: center;
    }

    .stat-topline {
      justify-content: space-between;
      margin-bottom: 22px;
      position: relative;
    }

    .stat-icon,
    .panel-icon,
    .process-icon,
    .system-icon {
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .stat-icon {
      width: 52px;
      height: 52px;
      border-radius: 18px;
      color: #ffffff;
      box-shadow: 0 14px 26px rgba(79, 70, 229, 0.22);
    }

    .tone-blue .stat-icon { background: linear-gradient(135deg, #2563eb, #60a5fa); }
    .tone-purple .stat-icon { background: linear-gradient(135deg, #7c3aed, #a78bfa); }
    .tone-cyan .stat-icon { background: linear-gradient(135deg, #0891b2, #22d3ee); }
    .tone-green .stat-icon { background: linear-gradient(135deg, #16a34a, #4ade80); }

    .stat-card:hover .stat-icon,
    .quick-action:hover mat-icon,
    .system-card:hover mat-icon {
      transform: scale(1.08);
    }

    mat-icon {
      transition: transform 0.2s ease;
    }

    .trend-pill {
      padding: 6px 10px;
      border-radius: 999px;
      color: #4f46e5;
      background: #eef2ff;
      font-size: 12px;
      font-weight: 800;
    }

    .stat-title {
      color: #64748b;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 8px;
      position: relative;
    }

    .stat-card h2 {
      font-size: 38px;
      letter-spacing: -0.04em;
      margin: 0 0 10px;
      position: relative;
    }

    .stat-footer {
      font-size: 13px;
      font-weight: 700;
      position: relative;
    }

    .insights-grid,
    .operations-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.65fr) minmax(340px, 0.85fr);
      gap: 20px;
    }

    .panel {
      border-radius: 24px;
      padding: 24px;
      transition: transform 0.24s ease, box-shadow 0.24s ease;
    }

    .panel-heading {
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 24px;
    }

    .panel-heading.compact {
      margin-bottom: 20px;
    }

    .panel-heading h2 {
      font-size: 20px;
      letter-spacing: -0.03em;
      color: #111827;
      margin-bottom: 6px;
      font-weight: 850;
    }

    .panel-heading p {
      font-size: 14px;
      font-weight: 600;
    }

    .panel-icon {
      width: 46px;
      height: 46px;
      border-radius: 16px;
      color: #4f46e5;
      background: #eef2ff;
    }

    .panel-icon.purple {
      color: #7c3aed;
      background: #f3e8ff;
    }

    .bar-chart {
      height: 268px;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 18px;
      align-items: end;
      padding: 18px 8px 0;
    }

    .bar-column {
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 9px;
    }

    .bar-track {
      width: 100%;
      max-width: 54px;
      height: 190px;
      border-radius: 999px;
      background: #eef2ff;
      display: flex;
      align-items: end;
      overflow: hidden;
      box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.08);
    }

    .bar-fill {
      width: 100%;
      border-radius: 999px;
      background: linear-gradient(180deg, #6366f1, #4f46e5);
      box-shadow: 0 12px 22px rgba(79, 70, 229, 0.24);
      animation: growBar 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
      transform-origin: bottom;
    }

    .bar-value {
      color: #312e81;
      font-size: 12px;
      font-weight: 800;
    }

    .bar-day {
      color: #94a3b8;
      font-size: 12px;
      font-weight: 700;
    }

    .distribution-panel {
      display: flex;
      flex-direction: column;
    }

    .donut-wrap {
      display: grid;
      place-items: center;
      padding: 8px 0 20px;
    }

    .donut-chart {
      width: 190px;
      height: 190px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: conic-gradient(#7c3aed 0deg 26deg, #4f46e5 26deg 360deg);
      box-shadow: 0 22px 40px rgba(79, 70, 229, 0.18);
      position: relative;
    }

    .donut-chart::after {
      content: '';
      position: absolute;
      inset: -8px;
      border-radius: inherit;
      border: 1px solid rgba(99, 102, 241, 0.14);
    }

    .donut-hole {
      width: 116px;
      height: 116px;
      border-radius: inherit;
      background: #ffffff;
      display: grid;
      place-items: center;
      align-content: center;
      gap: 2px;
      box-shadow: inset 0 0 0 1px #e5e7eb;
    }

    .donut-hole strong {
      font-size: 34px;
      letter-spacing: -0.05em;
      color: #111827;
    }

    .donut-hole span {
      color: #64748b;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .legend-list {
      display: grid;
      gap: 12px;
      margin-top: auto;
    }

    .legend-item {
      justify-content: space-between;
      padding: 14px;
      border-radius: 18px;
      background: #f8fafc;
      border: 1px solid #eef2f7;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      margin-right: 12px;
    }

    .legend-item.admin .legend-dot { background: #7c3aed; }
    .legend-item.user .legend-dot { background: #4f46e5; }

    .legend-item div {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .legend-item p {
      font-size: 13px;
      font-weight: 750;
    }

    .legend-item strong {
      font-size: 18px;
      color: #111827;
    }

    .table-scroll {
      width: 100%;
      overflow-x: auto;
    }

    .process-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      min-width: 720px;
    }

    .process-table th {
      color: #64748b;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      text-align: left;
      padding: 0 18px 14px;
    }

    .process-table td {
      padding: 18px;
      border-top: 1px solid #eef2f7;
      color: #475569;
      font-size: 14px;
      font-weight: 650;
    }

    .process-table tbody tr {
      transition: background 0.18s ease, transform 0.18s ease;
    }

    .process-table tbody tr:hover {
      background: #f8fafc;
    }

    .process-cell {
      gap: 12px;
      color: #111827;
      font-weight: 800;
    }

    .process-icon {
      width: 38px;
      height: 38px;
      border-radius: 14px;
      color: #4f46e5;
      background: #eef2ff;
    }

    .process-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 7px 11px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 850;
    }

    .status-generated {
      color: #0369a1;
      background: #e0f2fe;
    }

    .status-validated {
      color: #047857;
      background: #dcfce7;
    }

    .status-draft {
      color: #92400e;
      background: #fef3c7;
    }

    .timeline {
      position: relative;
      display: grid;
      gap: 0;
    }

    .timeline-item {
      display: grid;
      grid-template-columns: 44px 1fr;
      gap: 14px;
      position: relative;
      padding-bottom: 24px;
      animation: fadeUp 0.55s ease both;
    }

    .timeline-item::after {
      content: '';
      position: absolute;
      top: 44px;
      bottom: 0;
      left: 21px;
      width: 2px;
      background: #e5e7eb;
    }

    .timeline-item.last {
      padding-bottom: 0;
    }

    .timeline-item.last::after {
      display: none;
    }

    .timeline-marker {
      width: 44px;
      height: 44px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      color: #4f46e5;
      background: #eef2ff;
      border: 4px solid #ffffff;
      box-shadow: 0 10px 22px rgba(79, 70, 229, 0.14);
      z-index: 1;
    }

    .timeline-marker mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .timeline-content {
      padding: 11px 14px;
      border-radius: 18px;
      background: #f8fafc;
      border: 1px solid #eef2f7;
    }

    .timeline-content p {
      color: #111827;
      font-size: 14px;
      font-weight: 800;
      margin-bottom: 4px;
    }

    .timeline-content span {
      color: #94a3b8;
      font-size: 12px;
      font-weight: 750;
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .quick-action {
      min-height: 92px;
      flex-direction: column;
      border-radius: 20px;
      color: #312e81;
      background: #f8fafc;
      border: 1px solid #eef2f7;
      font-size: 14px;
    }

    .quick-action mat-icon {
      width: 28px;
      height: 28px;
      font-size: 28px;
      color: #4f46e5;
    }

    .quick-action:hover {
      background: #eef2ff;
      box-shadow: 0 16px 28px rgba(79, 70, 229, 0.14);
    }

    .status-panel {
      margin-bottom: 8px;
    }

    .all-online {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: #047857;
      background: #dcfce7;
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 850;
    }

    .all-online span {
      display: inline-block;
      box-shadow: none;
    }

    .all-online.offline {
      color: #b45309;
      background: #fef3c7;
    }

    .all-online.offline span,
    .online-dot.offline {
      background: #f59e0b;
      box-shadow: 0 0 0 5px rgba(245, 158, 11, 0.12);
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }

    .system-card {
      gap: 12px;
      border: 1px solid #eef2f7;
      border-radius: 20px;
      background: #f8fafc;
      padding: 16px;
      position: relative;
      transition: transform 0.2s ease, background 0.2s ease;
    }

    .system-card:hover {
      transform: translateY(-3px);
      background: #ffffff;
    }

    .system-card.offline {
      background: #fffbeb;
    }

    .system-icon {
      width: 42px;
      height: 42px;
      border-radius: 15px;
      color: #4f46e5;
      background: #eef2ff;
    }

    .system-card p {
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 3px;
    }

    .system-card strong {
      color: #111827;
      font-size: 15px;
    }

    .online-dot {
      position: absolute;
      right: 16px;
      top: 18px;
      box-shadow: 0 0 0 5px rgba(34, 197, 94, 0.12);
    }

    @keyframes fadeUp {
      from {
        opacity: 0;
        transform: translateY(14px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes growBar {
      from {
        transform: scaleY(0.08);
        opacity: 0.35;
      }
      to {
        transform: scaleY(1);
        opacity: 1;
      }
    }

    @media (max-width: 1180px) {
      .stats-grid,
      .status-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .insights-grid,
      .operations-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 760px) {
      .dashboard-shell {
        padding: 20px 14px 44px;
      }

      .hero-panel,
      .panel {
        padding: 20px;
        border-radius: 22px;
      }

      .hero-panel,
      .hero-actions,
      .panel-heading {
        align-items: flex-start;
        flex-direction: column;
      }

      .hero-actions,
      .soft-action,
      .primary-action,
      .ghost-action {
        width: 100%;
      }

      .stats-grid,
      .status-grid,
      .quick-actions {
        grid-template-columns: 1fr;
      }

      .bar-chart {
        gap: 10px;
        padding-left: 0;
        padding-right: 0;
      }

      .bar-track {
        max-width: 36px;
      }

      .donut-chart {
        width: 164px;
        height: 164px;
      }

      .donut-hole {
        width: 100px;
        height: 100px;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private refreshSubscription?: Subscription;

  private readonly dashboard = signal<AdminDashboardResponse | null>(null);

  readonly totalUsers = computed(() => this.dashboard()?.totalUsers ?? 0);
  readonly totalAdmins = computed(() => this.dashboard()?.totalAdmins ?? 0);
  readonly totalStandardUsers = computed(() => this.dashboard()?.totalStandardUsers ?? 0);
  readonly generatedModels = computed(() => this.dashboard()?.generatedModels ?? 0);

  readonly stats = computed<StatCard[]>(() => [
    {
      icon: 'groups',
      title: 'Total Users',
      value: String(this.totalUsers()),
      footer: `${this.totalAdmins()} administrators / ${this.totalStandardUsers()} users`,
      tone: 'blue'
    },
    {
      icon: 'admin_panel_settings',
      title: 'Administrators',
      value: String(this.totalAdmins()),
      footer: 'System managers',
      tone: 'purple'
    },
    {
      icon: 'person',
      title: 'Standard Users',
      value: String(this.totalStandardUsers()),
      footer: 'Active collaborators',
      tone: 'cyan'
    },
    {
      icon: 'account_tree',
      title: 'Generated BPMN Models',
      value: String(this.generatedModels()),
      footer: `+${this.dashboard()?.generatedToday ?? 0} today`,
      tone: 'green'
    }
  ]);

  readonly activityBars = computed<ActivityBar[]>(() => {
    const values = this.normalizeGenerationSeries(this.dashboard()?.generationPerDay ?? []);
    const maxValue = Math.max(...values, 1);

    return values.map((value, index) => ({
      day: this.lastSevenDayLabels()[index],
      value: value === 0 ? 4 : Math.max((value / maxValue) * 100, 8),
      label: String(value)
    }));
  });

  readonly processes = computed<ProcessRow[]>(() =>
    (this.dashboard()?.latestProcesses ?? [])
      .slice(0, 5)
      .map(process => this.mapProcess(process))
  );

  readonly timeline = computed<TimelineItem[]>(() =>
    (this.dashboard()?.recentActivities ?? [])
      .slice(0, 6)
      .map(activity => this.mapActivity(activity))
  );

  readonly donutBackground = computed(() => {
    const total = this.totalUsers();
    const adminDegrees = total > 0 ? (this.totalAdmins() / total) * 360 : 0;

    return `conic-gradient(#7c3aed 0deg ${adminDegrees}deg, #4f46e5 ${adminDegrees}deg 360deg)`;
  });

  readonly systems = computed<SystemStatus[]>(() => {
    const status = this.dashboard()?.systemStatus ?? {};

    return [
      this.mapSystem('Backend', status['backend'], 'dns'),
      this.mapSystem('FastAPI', status['fastApi'] ?? status['fastAPI'], 'api'),
      this.mapSystem('Database', status['database'], 'database'),
      this.mapSystem('Camunda', status['camunda'], 'hub')
    ];
  });

  readonly allSystemsOnline = computed(() => this.systems().every(system => system.online));

  readonly quickActions: QuickAction[] = [
    {
      icon: 'person_add',
      label: 'Create User',
      route: '/admin'
    },
    {
      icon: 'manage_accounts',
      label: 'Manage Users',
      route: '/admin'
    },
    {
      icon: 'history',
      label: 'View History',
      route: '/history'
    },
    {
      icon: 'ios_share',
      label: 'Export Report',
      route: '/admin/dashboard'
    }
  ];

  ngOnInit(): void {
    this.refreshSubscription = interval(60000)
      .pipe(
        startWith(0),
        switchMap(() => this.dashboardService.getDashboard().pipe(catchError(() => EMPTY)))
      )
      .subscribe(dashboard => this.dashboard.set(dashboard));
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  refreshDashboard(): void {
    this.dashboardService.getDashboard().pipe(catchError(() => EMPTY)).subscribe(dashboard => this.dashboard.set(dashboard));
  }

  statusClass(status: ProcessStatus): string {
    const classes: Record<string, string> = {
      Generated: 'status-generated',
      Validated: 'status-validated',
      Draft: 'status-draft'
    };

    return classes[status] ?? 'status-generated';
  }

  private normalizeGenerationSeries(values: number[]): number[] {
    const lastSevenValues = values.slice(-7);
    return [...Array(Math.max(7 - lastSevenValues.length, 0)).fill(0), ...lastSevenValues];
  }

  private lastSevenDayLabels(): string[] {
    const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
    const today = new Date();

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return formatter.format(date);
    });
  }

  private mapProcess(process: DashboardProcess): ProcessRow {
    return {
      process: process.process ?? process.processName ?? process.name ?? 'Untitled process',
      author: process.author ?? process.createdBy ?? 'Unknown',
      status: process.status ?? 'Generated',
      date: this.formatDate(process.date ?? process.generationDate ?? process.createdAt)
    };
  }

  private mapActivity(activity: DashboardActivity): TimelineItem {
    return {
      icon: activity.icon ?? this.activityIcon(activity.action ?? activity.title),
      title: activity.title ?? ([activity.actor, activity.action].filter(Boolean).join(' ') || 'Platform activity'),
      time: activity.time ?? this.relativeTime(activity.createdAt)
    };
  }

  private mapSystem(label: string, item: DashboardSystemStatusItem | DashboardSystemState | undefined, icon: string): SystemStatus {
    if (typeof item === 'string') {
      return {
        label,
        value: this.systemStatusLabel(item),
        icon,
        online: this.isOnline(item)
      };
    }

    const status = item?.status ?? item?.value ?? 'offline';

    return {
      label: item?.label ?? label,
      value: item?.value ?? this.systemStatusLabel(status),
      icon: item?.icon ?? icon,
      online: this.isOnline(status)
    };
  }

  private activityIcon(text: string | undefined): string {
    const value = text?.toLowerCase() ?? '';

    if (value.includes('export') || value.includes('xml')) return 'description';
    if (value.includes('svg') || value.includes('download')) return 'image';
    if (value.includes('user') || value.includes('created')) return 'person_add';
    if (value.includes('delete')) return 'delete';
    return 'account_tree';
  }

  private formatDate(value: string | undefined): string {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private relativeTime(value: string | undefined): string {
    if (!value) return 'Just now';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const diffInSeconds = Math.max(Math.floor((Date.now() - date.getTime()) / 1000), 0);
    if (diffInSeconds < 60) return 'Just now';

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  }

  private isOnline(status: DashboardSystemState): boolean {
    return ['online', 'healthy', 'connected', 'operational', 'up'].includes(status.toLowerCase());
  }

  private systemStatusLabel(status: DashboardSystemState): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
}