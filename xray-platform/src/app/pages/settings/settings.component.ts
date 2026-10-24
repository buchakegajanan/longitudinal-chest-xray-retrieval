import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, TopbarComponent, IconComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  private settingsService = inject(SettingsService);
  readonly settings = this.settingsService.settings;

  setDensity(density: 'compact' | 'comfortable' | 'spacious'): void {
    this.settingsService.update({ density });
  }

  toggleDemoIndicators(): void {
    this.settingsService.update({ showDemoIndicators: !this.settings().showDemoIndicators });
  }

  toggleSidebar(): void {
    this.settingsService.toggleSidebar();
  }
}
