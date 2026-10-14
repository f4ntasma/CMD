import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../core/auth';
import { Toasts } from '../core/toasts';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bar">
      <div class="container inner">
        <a class="brand" routerLink="/" (click)="open.set(false)">
          <img src="/mascot/spriteCool.png" alt="" width="40" height="40" />
          <span>Monkey Coffe <strong>Dev's</strong></span>
        </a>

        <button class="toggle" type="button" (click)="open.set(!open())" [attr.aria-expanded]="open()"
                aria-label="Abrir menú">☰</button>

        <nav class="links" [class.open]="open()" (click)="open.set(false)">
          <a routerLink="/cursos" routerLinkActive="active">Cursos</a>
          <a routerLink="/rutas" routerLinkActive="active">Rutas</a>
          <a routerLink="/blog" routerLinkActive="active">Blog</a>
          <a routerLink="/noticias" routerLinkActive="active">Noticias</a>
          <span class="grow"></span>
          @if (auth.user(); as user) {
            @if (auth.isAdmin()) {
              <a routerLink="/admin" routerLinkActive="active">Panel</a>
            }
            <a routerLink="/mi-aprendizaje" routerLinkActive="active">Mi aprendizaje</a>
            <a class="who" routerLink="/perfil" routerLinkActive="active" [title]="user.email">
              @if (user.avatarUrl) {
                <img [src]="user.avatarUrl" alt="" width="28" height="28" referrerpolicy="no-referrer" />
              } @else {
                <span class="avatar">{{ user.displayName.charAt(0).toUpperCase() }}</span>
              }
              {{ user.displayName }}
            </a>
            <button class="btn ghost small" type="button" (click)="logout()">Salir</button>
          } @else {
            <a routerLink="/ingresar" routerLinkActive="active">Ingresar</a>
            <a class="btn small" routerLink="/registro">Crear cuenta</a>
          }
        </nav>
      </div>
    </header>
  `,
  styles: `
    .bar {
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgb(13 15 21 / 82%);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--line);
    }
    .inner {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      min-height: 68px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      color: var(--text);
      font-weight: 600;
      font-size: 1.05rem;
      white-space: nowrap;
    }
    .brand strong {
      color: var(--brand-strong);
    }
    .links {
      display: flex;
      align-items: center;
      gap: 1.3rem;
      flex: 1;
    }
    .links > a:not(.btn) {
      color: var(--muted);
      font-weight: 600;
      font-size: 0.95rem;
    }
    .links > a:not(.btn):hover,
    .links > a.active {
      color: var(--text);
    }
    .grow {
      flex: 1;
    }
    .who {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }
    .who img,
    .avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
    }
    .avatar {
      display: grid;
      place-items: center;
      background: var(--blue);
      color: #fff;
      font-size: 0.8rem;
    }
    .toggle {
      display: none;
      margin-left: auto;
      background: none;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      color: var(--text);
      font-size: 1.2rem;
      padding: 0.25rem 0.65rem;
      cursor: pointer;
    }
    @media (max-width: 900px) {
      .toggle {
        display: block;
      }
      .links {
        display: none;
        position: absolute;
        inset: 68px 0 auto 0;
        flex-direction: column;
        align-items: stretch;
        gap: 0.9rem;
        padding: 1.2rem 1.25rem 1.5rem;
        background: var(--surface);
        border-bottom: 1px solid var(--line);
      }
      .links.open {
        display: flex;
      }
      .grow {
        display: none;
      }
    }
  `,
})
export class Header {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);
  protected readonly open = signal(false);

  protected async logout(): Promise<void> {
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.toasts.error(error);
    }
  }
}
