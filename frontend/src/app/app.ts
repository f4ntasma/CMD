import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Auth } from './core/auth';
import { Site } from './core/site';
import { Toasts } from './core/toasts';
import { Footer } from './layout/footer';
import { Header } from './layout/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-header />
    <main>
      <router-outlet />
    </main>
    <app-footer />

    <div class="toasts" aria-live="polite">
      @for (toast of toasts.items(); track toast.id) {
        <button type="button" class="toast" [class.error]="toast.kind === 'error'" (click)="toasts.dismiss(toast.id)">
          {{ toast.text }}
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    main {
      flex: 1;
    }
    .toasts {
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-width: min(420px, calc(100vw - 2.5rem));
    }
    .toast {
      text-align: left;
      padding: 0.8rem 1rem;
      border-radius: var(--radius-sm);
      border: 1px solid rgb(62 207 142 / 45%);
      background: #12241d;
      color: #c9f7e2;
      font: inherit;
      cursor: pointer;
      box-shadow: var(--shadow);
    }
    .toast.error {
      border-color: rgb(255 107 107 / 50%);
      background: #2a1518;
      color: #ffd0d0;
    }
  `,
})
export class App {
  protected readonly toasts = inject(Toasts);

  constructor() {
    inject(Site).load();
    const auth = inject(Auth);
    // La sesión solo existe en el navegador: se consulta tras el primer render.
    afterNextRender(() => void auth.ready());
  }
}
