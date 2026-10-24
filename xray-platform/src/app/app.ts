import { Component, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { SettingsService } from './services/settings.service';

@Component({
  imports: [RouterOutlet, CommonModule, SidebarComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  template: `
    <div class="app-shell" [class.sidebar-collapsed]="sidebarCollapsed()">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class App {
  private settingsService = inject(SettingsService);
  readonly sidebarCollapsed = computed(() => this.settingsService.settings().sidebarCollapsed);
}
