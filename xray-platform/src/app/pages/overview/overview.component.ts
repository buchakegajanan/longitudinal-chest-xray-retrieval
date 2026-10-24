import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { CasesService } from '../../services/cases.service';
import { MOCK_DASHBOARD_METRICS, MOCK_CASES, MOCK_SESSIONS } from '../../data/mock-data';
import { DashboardMetric, ResearchCase, AnalysisSession } from '../../models/models';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, TopbarComponent, IconComponent],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent implements OnInit {
  private casesService = inject(CasesService);

  readonly metrics: DashboardMetric[] = MOCK_DASHBOARD_METRICS;
  readonly recentSessions: AnalysisSession[] = MOCK_SESSIONS;
  readonly recentCases: ResearchCase[] = MOCK_CASES.slice(0, 4);
  readonly isLoaded = signal(false);

  ngOnInit(): void {
    setTimeout(() => this.isLoaded.set(true), 100);
  }

  formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  formatRelativeTime(isoDate: string): string {
    const now = new Date();
    const date = new Date(isoDate);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return this.formatDate(isoDate);
  }
}
