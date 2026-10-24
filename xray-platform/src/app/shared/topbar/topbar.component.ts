import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <header class="topbar" role="banner">
      <div class="topbar-left">
        @if (breadcrumbs && breadcrumbs.length > 0) {
          <nav class="breadcrumb" aria-label="Breadcrumb">
            @for (crumb of breadcrumbs; track crumb.label; let last = $last) {
              @if (!last) {
                <a [routerLink]="crumb.route" class="breadcrumb-link">{{ crumb.label }}</a>
                <app-icon name="chevron-right" [size]="14" class="breadcrumb-sep"></app-icon>
              } @else {
                <span class="breadcrumb-current" [attr.aria-current]="'page'">{{ crumb.label }}</span>
              }
            }
          </nav>
        } @else {
          <h1 class="page-heading">{{ pageTitle }}</h1>
        }
      </div>

      <div class="topbar-right">
        <!-- User profile -->
        <div class="user-profile" role="presentation">
          <div class="user-avatar" aria-hidden="true">
            <span>DR</span>
          </div>
          <div class="user-info">
            <span class="user-name">Dr. Research</span>
            <span class="user-role">Radiologist</span>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      height: var(--topbar-height);
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-6);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-width: 0;
    }

    .page-heading {
      font-size: var(--font-size-base);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--font-size-sm);
    }

    .breadcrumb-link {
      color: var(--color-text-muted);
      text-decoration: none;
      font-weight: 400;
      transition: color var(--transition-fast);

      &:hover { color: var(--color-accent); }
    }

    .breadcrumb-sep {
      color: var(--color-text-placeholder);
    }

    .breadcrumb-current {
      color: var(--color-text-primary);
      font-weight: 500;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .demo-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      background: var(--color-demo-bg);
      border: 1px solid #ddd6fe;
      border-radius: 100px;
      color: var(--color-demo);
      font-size: var(--font-size-xs);
      font-weight: 500;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-accent);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-text-primary);
      line-height: 1.3;
    }

    .user-role {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      line-height: 1.3;
    }

    @media (max-width: 600px) {
      .user-info { display: none; }
      .demo-badge span { display: none; }
    }
  `]
})
export class TopbarComponent {
  @Input() pageTitle: string = '';
  @Input() breadcrumbs?: { label: string; route?: string }[];
}
