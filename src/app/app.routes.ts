import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './pages/main-layout/main-layout.component';

export const routes: Routes = [
  { path: '', redirectTo: 'jobs', pathMatch: 'full' },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./pages/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'jobs',
        loadComponent: () =>
          import('./pages/jobs/jobs.component').then((m) => m.JobsComponent),
      },
      {
        path: 'active',
        loadComponent: () =>
          import('./pages/active-job/active-job.component').then((m) => m.ActiveJobComponent),
      },
      {
        path: 'earnings',
        loadComponent: () =>
          import('./pages/earnings/earnings.component').then((m) => m.EarningsComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'profile/history',
        loadComponent: () =>
          import('./pages/profile/history/history.component').then((m) => m.HistoryComponent),
      },
      {
        path: 'profile/performance',
        loadComponent: () =>
          import('./pages/profile/performance/performance.component').then((m) => m.PerformanceComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'jobs' },
];
