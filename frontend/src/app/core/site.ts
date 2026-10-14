import { Injectable, computed, inject, signal } from '@angular/core';
import { ContentApi } from './api';
import { SiteSettings } from './models';

export interface SocialLink {
  label: string;
  url: string;
}

/** Ajustes públicos del sitio (redes, Discord, instrucciones de pago). Se cargan una vez por visita. */
@Injectable({ providedIn: 'root' })
export class Site {
  private readonly api = inject(ContentApi);
  private requested = false;

  readonly settings = signal<SiteSettings>({});

  readonly socialLinks = computed<SocialLink[]>(() => {
    const settings = this.settings();
    return [
      { label: 'Discord', url: settings['discord_invite_url'] },
      { label: 'YouTube', url: settings['youtube_url'] },
      { label: 'TikTok', url: settings['tiktok_url'] },
      { label: 'GitHub', url: settings['github_url'] },
    ].filter((link): link is SocialLink => Boolean(link.url));
  });

  load(): void {
    if (this.requested) {
      return;
    }
    this.requested = true;
    this.api.settings().subscribe({
      next: (settings) => this.settings.set(settings),
      error: () => (this.requested = false),
    });
  }

  set(settings: SiteSettings): void {
    this.settings.set(settings);
  }
}
