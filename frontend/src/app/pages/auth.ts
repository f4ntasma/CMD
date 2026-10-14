import { ChangeDetectionStrategy, Component, afterNextRender, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../core/auth';
import { errorMessage } from '../core/http';

const PROVIDER_LABELS: Record<string, string> = { google: 'Google', github: 'GitHub', discord: 'Discord' };

/** Solo se vuelve a rutas internas: evita redirecciones abiertas con ?volver=https://otro-sitio. */
function safeReturnUrl(url: string | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/mi-aprendizaje';
}

const AUTH_STYLES = `
  .auth { padding: 3rem 0; }
  .auth .card { display: flex; flex-direction: column; gap: 1rem; }
  .auth h1 { font-size: 1.8rem; margin: 0; }
  .mascot { width: 110px; height: auto; align-self: center; }
  .divider { display: flex; align-items: center; gap: .8rem; color: var(--muted); font-size: .8rem; }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--line); }
  .center { text-align: center; margin: 0; }
`;

/** Botones de acceso con Google, GitHub y Discord; solo se muestran los que el servidor tiene activos. */
@Component({
  selector: 'app-social-buttons',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.providers().length > 0) {
      <div class="divider mono">o continúa con</div>
      <div class="row buttons">
        @for (provider of auth.providers(); track provider) {
          <a class="btn ghost" [href]="'/oauth2/authorization/' + provider">{{ labels[provider] || provider }}</a>
        }
      </div>
    }
  `,
  styles: AUTH_STYLES + '.buttons { justify-content: center; } .buttons .btn { flex: 1; }',
})
export class SocialButtons {
  protected readonly auth = inject(Auth);
  protected readonly labels = PROVIDER_LABELS;
}

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, SocialButtons],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container narrow auth">
      <form class="card" (ngSubmit)="submit()">
        <img class="mascot" src="/mascot/spriteConcentrated.webp" alt="" />
        <h1>Ingresar</h1>
        @if (message() || error(); as text) {
          <p class="alert error">{{ text }}</p>
        }
        <label>Correo
          <input type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
        </label>
        <label>Contraseña
          <input type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" />
        </label>
        <button class="btn block" type="submit" [disabled]="busy()">{{ busy() ? 'Entrando…' : 'Entrar' }}</button>
        <app-social-buttons />
        <p class="center"><a routerLink="/recuperar">¿Olvidaste tu contraseña?</a></p>
        <p class="center muted">¿Aún no tienes cuenta? <a routerLink="/registro" queryParamsHandling="preserve">Créala gratis</a></p>
      </form>
    </div>
  `,
  styles: AUTH_STYLES,
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly volver = input<string>();
  /** Mensaje que deja el servidor al fallar el acceso con un proveedor externo. */
  readonly error = input<string>();

  protected email = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly message = signal('');

  protected async submit(): Promise<void> {
    this.busy.set(true);
    this.message.set('');
    try {
      await this.auth.login(this.email, this.password);
      await this.router.navigateByUrl(safeReturnUrl(this.volver()));
    } catch (failure) {
      this.message.set(errorMessage(failure));
    } finally {
      this.busy.set(false);
    }
  }
}

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, SocialButtons],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container narrow auth">
      <form class="card" (ngSubmit)="submit()">
        <img class="mascot" src="/mascot/spriteHaveIdea.webp" alt="" />
        <h1>Crea tu cuenta</h1>
        @if (message(); as text) {
          <p class="alert error">{{ text }}</p>
        }
        <label>Nombre
          <input type="text" name="displayName" [(ngModel)]="displayName" required minlength="2" maxlength="80"
                 autocomplete="name" />
          <span class="hint">Así aparecerá en tus certificados.</span>
        </label>
        <label>Correo
          <input type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
        </label>
        <label>Contraseña
          <input type="password" name="password" [(ngModel)]="password" required minlength="10" maxlength="72"
                 autocomplete="new-password" />
          <span class="hint">Mínimo 10 caracteres.</span>
        </label>
        <button class="btn block" type="submit" [disabled]="busy()">{{ busy() ? 'Creando…' : 'Crear cuenta' }}</button>
        <app-social-buttons />
        <p class="center muted">¿Ya tienes cuenta? <a routerLink="/ingresar" queryParamsHandling="preserve">Ingresa</a></p>
      </form>
    </div>
  `,
  styles: AUTH_STYLES,
})
export class Register {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly volver = input<string>();

  protected displayName = '';
  protected email = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly message = signal('');

  protected async submit(): Promise<void> {
    this.busy.set(true);
    this.message.set('');
    try {
      await this.auth.register(this.email, this.displayName, this.password);
      await this.router.navigateByUrl(safeReturnUrl(this.volver()));
    } catch (failure) {
      this.message.set(errorMessage(failure));
    } finally {
      this.busy.set(false);
    }
  }
}

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container narrow auth">
      <form class="card" (ngSubmit)="submit()">
        <h1>Recuperar contraseña</h1>
        @if (sent()) {
          <p class="alert ok">Si existe una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva. Revisa también el correo no deseado.</p>
        } @else {
          <p class="muted center">Escribe tu correo y te enviaremos un enlace.</p>
          @if (message(); as text) {
            <p class="alert error">{{ text }}</p>
          }
          <label>Correo
            <input type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
          </label>
          <button class="btn block" type="submit" [disabled]="busy()">Enviar enlace</button>
        }
        <p class="center"><a routerLink="/ingresar">Volver a ingresar</a></p>
      </form>
    </div>
  `,
  styles: AUTH_STYLES,
})
export class ForgotPassword {
  private readonly auth = inject(Auth);
  protected email = '';
  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly message = signal('');

  protected async submit(): Promise<void> {
    this.busy.set(true);
    this.message.set('');
    try {
      await this.auth.forgotPassword(this.email);
      this.sent.set(true);
    } catch (failure) {
      this.message.set(errorMessage(failure));
    } finally {
      this.busy.set(false);
    }
  }
}

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container narrow auth">
      <form class="card" (ngSubmit)="submit()">
        <h1>Nueva contraseña</h1>
        @if (done()) {
          <p class="alert ok">Contraseña actualizada. Ya puedes ingresar con ella.</p>
          <a class="btn block" routerLink="/ingresar">Ingresar</a>
        } @else {
          @if (message(); as text) {
            <p class="alert error">{{ text }}</p>
          }
          <label>Contraseña nueva
            <input type="password" name="password" [(ngModel)]="password" required minlength="10" maxlength="72"
                   autocomplete="new-password" />
            <span class="hint">Mínimo 10 caracteres.</span>
          </label>
          <button class="btn block" type="submit" [disabled]="busy() || !token()">Guardar contraseña</button>
        }
      </form>
    </div>
  `,
  styles: AUTH_STYLES,
})
export class ResetPassword {
  private readonly auth = inject(Auth);
  readonly token = input<string>();
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly message = signal('');

  protected async submit(): Promise<void> {
    this.busy.set(true);
    this.message.set('');
    try {
      await this.auth.resetPassword(this.token() ?? '', this.password);
      this.done.set(true);
    } catch (failure) {
      this.message.set(errorMessage(failure));
    } finally {
      this.busy.set(false);
    }
  }
}

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container narrow auth">
      <div class="card">
        @switch (status()) {
          @case ('ok') {
            <img class="mascot" src="/mascot/spriteLaugh.webp" alt="" />
            <h1>¡Correo confirmado!</h1>
            <a class="btn block" routerLink="/cursos">Explorar cursos</a>
          }
          @case ('error') {
            <h1>No pudimos confirmar tu correo</h1>
            <p class="alert error">{{ message() }}</p>
            <a class="btn ghost block" routerLink="/perfil">Pedir otro enlace desde mi perfil</a>
          }
          @default {
            <p class="center muted">Confirmando tu correo…</p>
          }
        }
      </div>
    </div>
  `,
  styles: AUTH_STYLES,
})
export class VerifyEmail {
  private readonly auth = inject(Auth);
  readonly token = input<string>();
  protected readonly status = signal<'pending' | 'ok' | 'error'>('pending');
  protected readonly message = signal('');

  constructor() {
    afterNextRender(async () => {
      try {
        await this.auth.ready();
        await this.auth.verifyEmail(this.token() ?? '');
        this.status.set('ok');
      } catch (failure) {
        this.message.set(errorMessage(failure));
        this.status.set('error');
      }
    });
  }
}
