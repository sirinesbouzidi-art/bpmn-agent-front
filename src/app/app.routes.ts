import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/history.component').then((m) => m.HistoryComponent)
  },
  {
    path: 'viewer',
    canActivate: [authGuard],
    loadComponent: () => import('./features/bpmn-viewer/viewer.component').then((m) => m.ViewerComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'activity-logs',
        loadComponent: () => import('./features/admin/activity-logs.component').then((m) => m.ActivityLogsComponent)
      }
    ]
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about.component').then((m) => m.AboutComponent)
  },
  { 
    path: '', 
    pathMatch: 'full', 
    redirectTo: 'about' 
  },
  { 
    path: '**', 
    redirectTo: 'about' 
  }
];