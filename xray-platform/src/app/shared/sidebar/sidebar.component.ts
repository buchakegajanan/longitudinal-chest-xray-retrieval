import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../icon/icon.component';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', route: '/overview', icon: 'layout-dashboard' },
  { label: 'New X-Ray Analysis', route: '/analysis', icon: 'upload-cloud' },
  { label: 'Similar Cases', route: '/similar-cases', icon: 'layers' },
  { label: 'Patient Timelines', route: '/timelines', icon: 'timeline' },
  { label: 'Image Comparison', route: '/comparison', icon: 'columns' },
  { label: 'Research Dataset', route: '/dataset', icon: 'database' },
  { label: 'Settings', route: '/settings', icon: 'settings' },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="logo-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a56db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/>
          </svg>
        </div>
        @if (!collapsed()) {
          <div class="logo-text fade-in">
            <span class="logo-name">XRay Insight</span>
            <span class="logo-subtitle">Research Platform</span>
          </div>
        }
      </div>

      <hr class="sidebar-divider">

      <!-- Navigation -->
      <nav class="sidebar-nav" aria-label="Main navigation">
        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            class="nav-item"
            [title]="collapsed() ? item.label : ''"
            [attr.aria-label]="item.label"
          >
            <span class="nav-icon">
              <app-icon [name]="item.icon" [size]="18" [strokeWidth]="1.75"></app-icon>
            </span>
            @if (!collapsed()) {
              <span class="nav-label">{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <!-- Collapse toggle -->
      <div class="sidebar-footer">
        <button
          class="collapse-btn"
          (click)="toggleCollapse()"
          [title]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <app-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="16"></app-icon>
          @if (!collapsed()) {
            <span>Collapse</span>
          }
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-width);
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      background: var(--color-bg-sidebar);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      transition: width var(--transition-base);
      overflow: hidden;
      z-index: 100;

      &.collapsed {
        width: var(--sidebar-width-collapsed);
      }
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 14px;
      min-height: var(--topbar-height);
    }

    .logo-mark {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: #ebf0fd;
      border-radius: var(--radius-lg);
      flex-shrink: 0;
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .logo-name {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--color-text-primary);
      white-space: nowrap;
      letter-spacing: -0.02em;
    }

    .logo-subtitle {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      white-space: nowrap;
      font-weight: 400;
    }

    .sidebar-divider {
      border: none;
      border-top: 1px solid var(--color-border-subtle);
      margin: 0 12px;
    }

    .sidebar-nav {
      flex: 1;
      padding: 10px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      font-weight: 500;
      text-decoration: none;
      white-space: nowrap;
      transition: background-color var(--transition-fast), color var(--transition-fast);
      cursor: pointer;

      &:hover {
        background-color: var(--color-bg-tertiary);
        color: var(--color-text-primary);
        text-decoration: none;
      }

      &.active {
        background-color: var(--color-accent-light);
        color: var(--color-accent);

        .nav-icon {
          color: var(--color-accent);
        }
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: -2px;
      }
    }

    .nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .nav-label {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-footer {
      padding: 10px 8px;
      border-top: 1px solid var(--color-border-subtle);
    }

    .collapse-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 10px;
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color var(--transition-fast), color var(--transition-fast);

      &:hover {
        background-color: var(--color-bg-tertiary);
        color: var(--color-text-secondary);
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: -2px;
      }
    }

    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
        transition: transform var(--transition-base), width var(--transition-base);

        &.mobile-open {
          transform: translateX(0);
        }

        &.collapsed {
          width: var(--sidebar-width);
        }
      }
    }
  `]
})
export class SidebarComponent {
  private settingsService = inject(SettingsService);
  readonly collapsed = computed(() => this.settingsService.settings().sidebarCollapsed);
  readonly navItems = NAV_ITEMS;

  toggleCollapse(): void {
    this.settingsService.toggleSidebar();
  }
}
