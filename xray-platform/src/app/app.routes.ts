import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full'
  },
  {
    path: 'overview',
    loadComponent: () => import('./pages/overview/overview.component').then(m => m.OverviewComponent),
    title: 'Overview — XRay Insight'
  },
  {
    path: 'analysis',
    loadComponent: () => import('./pages/analysis/analysis.component').then(m => m.AnalysisComponent),
    title: 'New X-Ray Analysis — XRay Insight'
  },
  {
    path: 'similar-cases',
    loadComponent: () => import('./pages/similar-cases/similar-cases.component').then(m => m.SimilarCasesComponent),
    title: 'Similar Cases — XRay Insight'
  },
  {
    path: 'timelines',
    loadComponent: () => import('./pages/timelines/timelines.component').then(m => m.TimelinesComponent),
    title: 'Patient Timelines — XRay Insight'
  },
  {
    path: 'timelines/:id',
    loadComponent: () => import('./pages/timelines/timelines.component').then(m => m.TimelinesComponent),
    title: 'Patient Timeline — XRay Insight'
  },
  {
    path: 'comparison',
    loadComponent: () => import('./pages/comparison/comparison.component').then(m => m.ComparisonComponent),
    title: 'Image Comparison — XRay Insight'
  },
  {
    path: 'dataset',
    loadComponent: () => import('./pages/dataset/dataset.component').then(m => m.DatasetComponent),
    title: 'Research Dataset — XRay Insight'
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
    title: 'Settings — XRay Insight'
  },
  {
    path: '**',
    redirectTo: 'overview'
  }
];
