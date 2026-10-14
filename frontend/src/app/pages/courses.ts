import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { CatalogApi } from '../core/api';
import { LEVEL_LABELS, Level } from '../core/models';
import { CourseCardComponent } from '../shared/course-card';
import { loader } from '../shared/loader';

/** Catálogo. Los filtros viven en la URL (?categoria=&nivel=&precio=&q=&pagina=) para poder compartirla. */
@Component({
  selector: 'app-courses',
  imports: [FormsModule, RouterLink, CourseCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <header class="page-title">
        <span class="eyebrow">Catálogo</span>
        <h1>Cursos</h1>
        <p>Filtra por tema, nivel o precio y empieza por el que más te llame.</p>
      </header>

      <form class="filters card" (ngSubmit)="apply({ q: search })">
        <input type="search" name="q" [(ngModel)]="search" placeholder="Buscar un curso…" aria-label="Buscar un curso" />
        <select name="categoria" [ngModel]="categoria() ?? ''" (ngModelChange)="apply({ categoria: $event })"
                aria-label="Categoría">
          <option value="">Todas las categorías</option>
          @for (category of categories(); track category.id) {
            <option [value]="category.slug">{{ category.name }}</option>
          }
        </select>
        <select name="nivel" [ngModel]="nivel() ?? ''" (ngModelChange)="apply({ nivel: $event })" aria-label="Nivel">
          <option value="">Todos los niveles</option>
          @for (level of levels; track level) {
            <option [value]="level">{{ levelLabels[level] }}</option>
          }
        </select>
        <select name="precio" [ngModel]="precio() ?? ''" (ngModelChange)="apply({ precio: $event })" aria-label="Precio">
          <option value="">Gratis y de pago</option>
          <option value="gratis">Solo gratis</option>
          <option value="pago">Solo de pago</option>
        </select>
        <button class="btn" type="submit">Buscar</button>
      </form>

      @if (courses.loading() && !courses.value()) {
        <div class="grid results">
          @for (placeholder of [1, 2, 3]; track placeholder) {
            <div class="skeleton"></div>
          }
        </div>
      } @else if (courses.error()) {
        <p class="alert error results">No se pudieron cargar los cursos. <button class="link-btn" (click)="courses.reload()">Reintentar</button></p>
      } @else if (courses.value(); as page) {
        @if (page.content.length === 0) {
          <div class="empty">
            <img src="/mascot/spriteThink.png" alt="" />
            <p>No hay cursos con esos filtros todavía.</p>
            <a class="btn ghost small" routerLink="/cursos">Quitar filtros</a>
          </div>
        } @else {
          <p class="muted mono count">{{ page.totalElements }} {{ page.totalElements === 1 ? 'curso' : 'cursos' }}</p>
          <div class="grid">
            @for (course of page.content; track course.id) {
              <app-course-card [course]="course" />
            }
          </div>
          @if (page.totalPages > 1) {
            <nav class="row pager">
              <button class="btn ghost small" [disabled]="page.page === 0" (click)="apply({ pagina: page.page })">← Anterior</button>
              <span class="muted mono">Página {{ page.page + 1 }} de {{ page.totalPages }}</span>
              <button class="btn ghost small" [disabled]="page.page + 1 >= page.totalPages"
                      (click)="apply({ pagina: page.page + 2 })">Siguiente →</button>
            </nav>
          }
        }
      }
    </div>
  `,
  styles: `
    .filters {
      display: grid;
      grid-template-columns: 2fr repeat(3, 1fr) auto;
      gap: 0.75rem;
      padding: 1rem;
    }
    .results,
    .count {
      margin-top: 1.5rem;
    }
    .count {
      font-size: 0.8rem;
    }
    .pager {
      justify-content: center;
      margin-top: 2rem;
    }
    @media (max-width: 900px) {
      .filters {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export class Courses {
  private readonly api = inject(CatalogApi);
  private readonly router = inject(Router);

  // Parámetros de la URL, enlazados por el router.
  readonly categoria = input<string>();
  readonly nivel = input<string>();
  readonly precio = input<string>();
  readonly q = input<string>();
  readonly pagina = input<string>();

  protected search = '';
  protected readonly levels: Level[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
  protected readonly levelLabels = LEVEL_LABELS;
  protected readonly categories = toSignal(this.api.categories().pipe(catchError(() => of([]))), { initialValue: [] });

  private readonly filters = computed(() => ({
    category: this.categoria(),
    level: this.nivel(),
    free: this.precio() === 'gratis' ? true : this.precio() === 'pago' ? false : null,
    q: this.q(),
    page: Math.max(Number(this.pagina() ?? 1) - 1, 0) || 0,
  }));

  protected readonly courses = loader(this.filters, (filters) => this.api.courses(filters));

  constructor() {
    // El cuadro de búsqueda refleja lo que diga la URL (p. ej. al volver atrás).
    effect(() => (this.search = this.q() ?? ''));
  }

  /** Cambia filtros en la URL. Cualquier filtro nuevo vuelve a la primera página. */
  protected apply(change: Record<string, string | number>): void {
    const queryParams: Record<string, string | number | null> = { pagina: null };
    for (const [key, value] of Object.entries(change)) {
      queryParams[key] = value === '' ? null : value;
    }
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
  }
}
