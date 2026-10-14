import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { CatalogApi } from '../core/api';
import { CourseCardComponent } from '../shared/course-card';
import { loader } from '../shared/loader';

@Component({
  selector: 'app-paths',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <header class="page-title">
        <span class="eyebrow">Rutas de aprendizaje</span>
        <h1>Un camino claro, curso a curso</h1>
        <p>Cada ruta ordena los cursos que necesitas para llegar a un objetivo, sin adivinar qué viene después.</p>
      </header>
      <div class="grid-2">
        @for (path of paths(); track path.id) {
          <a class="card hover path" [routerLink]="['/rutas', path.slug]">
            <span class="badge brand">{{ path.courseCount }} {{ path.courseCount === 1 ? 'curso' : 'cursos' }}</span>
            <h2>{{ path.title }}</h2>
            <p class="muted">{{ path.description }}</p>
            <span>Ver la ruta →</span>
          </a>
        } @empty {
          <div class="empty">
            <img src="/mascot/spriteHaveIdea.png" alt="" />
            <p>Estamos preparando las primeras rutas. Mientras tanto, <a routerLink="/cursos">explora los cursos</a>.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .path {
      color: var(--text);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      align-items: flex-start;
    }
    .path h2 {
      margin: 0.3rem 0 0;
      font-size: 1.5rem;
    }
    .path span:last-child {
      color: var(--blue-soft);
      font-weight: 600;
    }
  `,
})
export class Paths {
  protected readonly paths = toSignal(inject(CatalogApi).paths().pipe(catchError(() => of([]))), { initialValue: [] });
}

@Component({
  selector: 'app-path-detail',
  imports: [RouterLink, CourseCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      @if (path.value(); as data) {
        <header class="page-title">
          <a class="muted" routerLink="/rutas">← Todas las rutas</a>
          <span class="eyebrow top">Ruta de aprendizaje</span>
          <h1>{{ data.title }}</h1>
          <p>{{ data.description }}</p>
        </header>
        <ol class="steps">
          @for (course of data.courses; track course.id; let index = $index) {
            <li>
              <span class="step mono">{{ index + 1 }}</span>
              <app-course-card [course]="course" />
            </li>
          } @empty {
            <li class="muted">Esta ruta aún no tiene cursos publicados.</li>
          }
        </ol>
      } @else if (!path.loading()) {
        <div class="empty">
          <img src="/mascot/spriteThink.png" alt="" />
          <h2>No encontramos esa ruta</h2>
          <a class="btn" routerLink="/rutas">Ver las rutas</a>
        </div>
      }
    </div>
  `,
  styles: `
    .top {
      margin-top: 1.2rem;
    }
    .steps {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 1.5rem;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
    .steps li {
      position: relative;
    }
    .step {
      position: absolute;
      z-index: 1;
      top: -0.7rem;
      left: -0.7rem;
      width: 2.2rem;
      height: 2.2rem;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--brand);
      color: #fff;
      font-weight: 700;
      box-shadow: 0 0 0 4px var(--bg);
    }
  `,
})
export class PathDetailPage {
  private readonly api = inject(CatalogApi);
  readonly slug = input.required<string>();
  protected readonly path = loader(this.slug, (slug) => this.api.path(slug));
}
