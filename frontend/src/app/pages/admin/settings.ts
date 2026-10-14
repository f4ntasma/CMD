import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, ContentApi } from '../../core/api';
import { SiteSettings } from '../../core/models';
import { Site } from '../../core/site';
import { Toasts } from '../../core/toasts';

@Component({
  selector: 'app-admin-settings',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Ajustes del sitio</h1>
    @if (values(); as model) {
      <form class="stack" (ngSubmit)="save()">
        <div class="card stack">
          <h2>Redes y comunidad</h2>
          <label>Invitación de Discord
            <input type="url" name="discord_invite_url" [(ngModel)]="model['discord_invite_url']" placeholder="https://discord.gg/…" />
          </label>
          <label>ID del servidor de Discord
            <input type="text" name="discord_guild_id" [(ngModel)]="model['discord_guild_id']" placeholder="123456789012345678" />
            <span class="hint">Opcional. Muestra cuánta gente hay en línea. Actívalo en Discord: Ajustes del servidor → Widget → «Habilitar widget», y copia el ID del servidor.</span>
          </label>
          <label>Canal de YouTube
            <input type="url" name="youtube_url" [(ngModel)]="model['youtube_url']" placeholder="https://www.youtube.com/@tucanal" />
          </label>
          <label>ID del canal de YouTube
            <input type="text" name="youtube_channel_id" [(ngModel)]="model['youtube_channel_id']" placeholder="UCxxxxxxxxxxxxxxxxxxxxxx" />
            <span class="hint">Opcional. Muestra tus últimos videos en la portada. Está en YouTube: Configuración → Configuración avanzada → «ID del canal».</span>
          </label>
          <label>TikTok
            <input type="url" name="tiktok_url" [(ngModel)]="model['tiktok_url']" placeholder="https://www.tiktok.com/@tuusuario" />
          </label>
          <label>GitHub
            <input type="url" name="github_url" [(ngModel)]="model['github_url']" placeholder="https://github.com/…" />
          </label>
        </div>

        <div class="card stack">
          <h2>Pagos</h2>
          <label>Instrucciones de pago
            <textarea name="payment_instructions" [(ngModel)]="model['payment_instructions']" rows="5" maxlength="2000"></textarea>
            <span class="hint">Se muestran al comprar un curso. Indica tu número de Yape o Plin y el nombre del titular. No pongas contraseñas ni datos privados: este texto es público.</span>
          </label>
        </div>

        <div><button class="btn" type="submit" [disabled]="busy()">Guardar ajustes</button></div>
      </form>
    } @else {
      <div class="skeleton"></div>
    }
  `,
  styles: `
    h2 {
      font-size: 1.2rem;
      margin: 0;
    }
  `,
})
export class AdminSettings {
  private readonly api = inject(AdminApi);
  private readonly site = inject(Site);
  private readonly toasts = inject(Toasts);

  protected readonly values = signal<SiteSettings | null>(null);
  protected readonly busy = signal(false);

  constructor() {
    inject(ContentApi).settings().subscribe({ next: (settings) => this.values.set({ ...settings }), error: (e: unknown) => this.toasts.error(e) });
  }

  protected save(): void {
    const values = this.values();
    if (!values) {
      return;
    }
    this.busy.set(true);
    this.api.saveSettings(values).subscribe({
      next: (saved) => {
        this.values.set({ ...saved });
        this.site.set(saved);
        this.busy.set(false);
        this.toasts.ok('Ajustes guardados');
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.toasts.error(error);
      },
    });
  }
}
