import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Site } from '../core/site';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer>
      <div class="container cols">
        <div>
          <strong class="name">Monkey Coffe <span>Dev's</span></strong>
          <p class="muted">Academia de programación, bases de datos, ciberseguridad e IA. Código, café y comunidad.</p>
        </div>
        <nav>
          <span class="mono head">Academia</span>
          <a routerLink="/cursos">Cursos</a>
          <a routerLink="/rutas">Rutas de aprendizaje</a>
          <a routerLink="/blog">Blog</a>
          <a routerLink="/noticias">Noticias</a>
        </nav>
        <nav>
          <span class="mono head">Comunidad</span>
          @for (link of site.socialLinks(); track link.label) {
            <a [href]="link.url" target="_blank" rel="noopener noreferrer">{{ link.label }}</a>
          } @empty {
            <span class="muted">Pronto, nuestras redes.</span>
          }
        </nav>
      </div>
      <div class="container legal muted mono">© {{ year }} Monkey Coffe Dev's · Proyecto de código abierto</div>
    </footer>
  `,
  styles: `
    footer {
      margin-top: 4rem;
      border-top: 1px solid var(--line);
      background: #05070a;
      padding: 2.5rem 0 1.5rem;
    }
    .cols {
      display: grid;
      gap: 2rem;
      grid-template-columns: 2fr 1fr 1fr;
    }
    .name {
      font-family: var(--display);
      font-size: 1.3rem;
    }
    .name span {
      color: var(--brand-strong);
    }
    p {
      max-width: 38ch;
      margin-top: 0.5rem;
    }
    nav {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    nav a {
      color: var(--muted);
    }
    nav a:hover {
      color: var(--text);
    }
    .head {
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--neon);
      margin-bottom: 0.3rem;
    }
    .legal {
      margin-top: 2rem;
      font-size: 0.78rem;
    }
    @media (max-width: 720px) {
      .cols {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class Footer {
  protected readonly site = inject(Site);
  protected readonly year = new Date().getFullYear();
}
