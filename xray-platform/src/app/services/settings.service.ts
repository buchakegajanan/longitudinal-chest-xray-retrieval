import { Injectable, signal } from '@angular/core';
import { AppSettings } from '../models/models';

const SETTINGS_KEY = 'xray_insight_settings';

const DEFAULT_SETTINGS: AppSettings = {
  density: 'comfortable',
  theme: 'light',
  sidebarCollapsed: false,
  showDemoIndicators: true,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private _settings = signal<AppSettings>(this.load());

  readonly settings = this._settings.asReadonly();

  private load(): AppSettings {
    try {
      const stored = sessionStorage.getItem(SETTINGS_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private save(settings: AppSettings): void {
    try {
      sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch { /* ignore */ }
  }

  update(partial: Partial<AppSettings>): void {
    const next = { ...this._settings(), ...partial };
    this._settings.set(next);
    this.save(next);
  }

  toggleSidebar(): void {
    this.update({ sidebarCollapsed: !this._settings().sidebarCollapsed });
  }

  get density(): string {
    return this._settings().density;
  }
}
