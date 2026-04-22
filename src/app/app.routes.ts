import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent)
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
    path: 'about',
    canActivate: [authGuard],
    loadComponent: () => import('./features/about/about.component').then((m) => m.AboutComponent)
  },
  { 
    path: '', 
    pathMatch: 'full', 
    redirectTo: 'login' 
  },
  { 
    path: '**', 
    redirectTo: 'login' 
  }
];