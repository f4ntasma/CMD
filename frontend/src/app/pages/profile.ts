import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../core/auth';
import { Toasts } from '../core/toasts';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <header class="page-title">
        <span class="eyebrow">Mi cuenta</span>
        <h1>Perfil</h1>
        <p class="mono">{{ auth.user()?.email }}</p>
      </header>

      @if (auth.user(); as user) {
        @if (!user.emailVerified) {
          <p class="alert info spaced">
            Tu correo aún no está confirmado.
            <button class="link-btn" type="button" (click)="resend()">Reenviar el enlace de confirmación</button>
          </p>
        }
        <div class="grid-2">
          <form class="card stack" (ngSubmit)="saveProfile()">
            <h2>Datos</h2>
            <label>Nombre
              <input type="text" name="displayName" [(ngModel)]="displayName" required minlength="2" maxlength="80" />
              <span class="hint">Es el nombre que aparece en tus certificados y comentarios.</span>
            </label>
            <label>Foto (enlace)
              <input type="url" name="avatarUrl" [(ngModel)]="avatarUrl" placeholder="https://…" maxlength="500" />
            </label>
            <button class="btn" type="submit" [disabled]="busy()">Guardar</button>
          </form>

          <form class="card stack" (ngSubmit)="savePassword()">
            <h2>{{ user.hasPassword ? 'Cambiar contraseña' : 'Crear contraseña' }}</h2>
            @if (user.hasPassword) {
              <label>Contraseña actual
                <input type="password" name="currentPassword" [(ngModel)]="currentPassword" required
                       autocomplete="current-password" />
              </label>
            } @else {
              <p class="muted">Entraste con una cuenta externa. Puedes añadir una contraseña para ingresar también con tu correo.</p>
            }
            <label>Contraseña nueva
              <input type="password" name="newPassword" [(ngModel)]="newPassword" required minlength="10" maxlength="72"
                     autocomplete="new-password" />
              <span class="hint">Mínimo 10 caracteres.</span>
            </label>
            <button class="btn" type="submit" [disabled]="busy()">Guardar contraseña</button>
          </form>
        </div>
      }
    </div>
  `,
  styles: `
    .spaced {
      margin-bottom: 1.5rem;
    }
    h2 {
      font-size: 1.3rem;
      margin: 0;
    }
  `,
})
export class Profile {
  protected readonly auth = inject(Auth);
  private readonly toasts = inject(Toasts);

  protected displayName = this.auth.user()?.displayName ?? '';
  protected avatarUrl = this.auth.user()?.avatarUrl ?? '';
  protected currentPassword = '';
  protected newPassword = '';
  protected readonly busy = signal(false);

  protected saveProfile(): Promise<void> {
    return this.run(() => this.auth.updateProfile(this.displayName, this.avatarUrl), 'Perfil actualizado');
  }

  protected async savePassword(): Promise<void> {
    await this.run(() => this.auth.changePassword(this.currentPassword, this.newPassword), 'Contraseña actualizada');
    this.currentPassword = '';
    this.newPassword = '';
  }

  protected resend(): Promise<void> {
    return this.run(() => this.auth.resendVerification(), 'Te enviamos un nuevo enlace de confirmación');
  }

  private async run(action: () => Promise<unknown>, success: string): Promise<void> {
    this.busy.set(true);
    try {
      await action();
      this.toasts.ok(success);
    } catch (error) {
      this.toasts.error(error);
    } finally {
      this.busy.set(false);
    }
  }
}
