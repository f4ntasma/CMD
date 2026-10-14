import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminApi, CatalogApi } from '../../core/api';
import { AdminCourse } from '../../core/models';
import { Toasts } from '../../core/toasts';
import { PricePipe } from '../../shared/format';

const STATUS_LABELS = { DRAFT: 'Borrador', PUBLISHED: 'Publicado', ARCHIVED: 'Archivado' } as const;

@Component({
  selector: 'app-admin-courses',
  imports: [FormsModule, RouterLink, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Cursos</h1>

    <form class="card form-row new" (ngSubmit)="create()">
      <label>Título del curso nuevo
        <input type="text" name="title" [(ngModel)]="title" required maxlength="150" />
      </label>
      <label>Categoría
        <select name="categoryId" [(ngModel)]="categoryId" required>
          @for (category of categories(); track category.id) {
            <option [ngValue]="category.id">{{ category.name }}</option>
          }
        </select>
      </label>
      <div class="end"><button class="btn" type="submit" [disabled]="!title.trim() || !categoryId">Crear borrador</button></div>
    </form>

    <div class="card table-wrap">
      <table>
        <thead><tr><th>Curso</th><th>Categoría</th><th class="num">Precio</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          @for (course of courses(); track course.id) {
            <tr>
              <td><a [routerLink]="['/admin/cursos', course.id]">{{ course.title }}</a></td>
              <td>{{ course.categoryName }}</td>
              <td class="num">{{ course.price | price: course.currency }}</td>
              <td><span class="badge" [class.ok]="course.status === 'PUBLISHED'">{{ statuses[course.status] }}</span></td>
              <td class="num"><a class="btn ghost small" [routerLink]="['/admin/cursos', course.id]">Editar</a></td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="muted">Aún no hay cursos. Crea el primero arriba.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .new {
      margin-bottom: 1.25rem;
      align-items: end;
    }
    .end {
      display: flex;
      align-items: flex-end;
    }
  `,
})
export class AdminCourses {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);

  protected readonly statuses = STATUS_LABELS;
  protected readonly categories = toSignal(inject(CatalogApi).categories(), { initialValue: [] });
  protected readonly courses = signal<AdminCourse[]>([]);
  protected title = '';
  protected categoryId: number | null = null;

  constructor() {
    this.api.courses().subscribe({ next: (courses) => this.courses.set(courses), error: (e: unknown) => this.toasts.error(e) });
  }

  /** Crea el curso como borrador con lo mínimo y abre el editor para completarlo. */
  protected create(): void {
    const title = this.title.trim();
    this.api
      .saveCourse(null, {
        title,
        summary: 'Resumen pendiente',
        description: '',
        categoryId: this.categoryId,
        level: 'BEGINNER',
        price: 0,
        status: 'DRAFT',
        featured: false,
      })
      .subscribe({
        next: (course) => void this.router.navigate(['/admin/cursos', course.id]),
        error: (error: unknown) => this.toasts.error(error),
      });
  }
}
