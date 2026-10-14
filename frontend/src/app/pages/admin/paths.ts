import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/api';
import { AdminCourse, AdminPath } from '../../core/models';
import { Toasts } from '../../core/toasts';

interface PathForm {
  id: number | null;
  title: string;
  slug: string;
  description: string;
  published: boolean;
  position: number;
  courseIds: number[];
}

const EMPTY: PathForm = { id: null, title: '', slug: '', description: '', published: false, position: 0, courseIds: [] };

@Component({
  selector: 'app-admin-paths',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Rutas de aprendizaje</h1>
    <div class="grid-2">
      <div class="stack">
        @for (path of paths(); track path.id) {
          <div class="card spread">
            <div>
              <strong>{{ path.title }}</strong>
              <div class="muted">{{ path.courseIds.length }} cursos ·
                <span class="badge" [class.ok]="path.published">{{ path.published ? 'Visible' : 'Oculta' }}</span>
              </div>
            </div>
            <div class="row">
              <button class="btn ghost small" type="button" (click)="edit(path)">Editar</button>
              <button class="btn danger small" type="button" (click)="remove(path)">Borrar</button>
            </div>
          </div>
        } @empty {
          <p class="muted">Aún no hay rutas.</p>
        }
      </div>

      <form class="card stack" (ngSubmit)="save()">
        <h2>{{ form.id ? 'Editar ruta' : 'Nueva ruta' }}</h2>
        <label>Título <input type="text" name="title" [(ngModel)]="form.title" required maxlength="150" /></label>
        <label>Descripción <textarea name="description" [(ngModel)]="form.description" rows="3" maxlength="600"></textarea></label>
        <div class="form-row">
          <label>Orden <input type="number" name="position" [(ngModel)]="form.position" /></label>
          <label class="check"><input type="checkbox" name="published" [(ngModel)]="form.published" /> Visible en el sitio</label>
        </div>

        <div>
          <strong>Cursos de la ruta, en orden</strong>
          <ol class="chosen">
            @for (courseId of form.courseIds; track courseId; let index = $index) {
              <li>
                <span class="grow">{{ titleOf(courseId) }}</span>
                <button class="link-btn" type="button" [disabled]="index === 0" (click)="move(index, -1)">↑</button>
                <button class="link-btn" type="button" [disabled]="index === form.courseIds.length - 1" (click)="move(index, 1)">↓</button>
                <button class="link-btn" type="button" (click)="form.courseIds.splice(index, 1)">Quitar</button>
              </li>
            } @empty {
              <li class="muted">Añade cursos con el selector de abajo.</li>
            }
          </ol>
          <select name="add" [ngModel]="null" (ngModelChange)="add($event)" aria-label="Añadir curso a la ruta">
            <option [ngValue]="null">+ Añadir curso…</option>
            @for (course of courses(); track course.id) {
              @if (!form.courseIds.includes(course.id)) {
                <option [ngValue]="course.id">{{ course.title }}{{ course.status === 'PUBLISHED' ? '' : ' (no publicado)' }}</option>
              }
            }
          </select>
        </div>

        <div class="row">
          <button class="btn" type="submit" [disabled]="!form.title.trim()">Guardar</button>
          @if (form.id) {
            <button class="btn ghost" type="button" (click)="reset()">Cancelar</button>
          }
        </div>
      </form>
    </div>
  `,
  styles: `
    h2 {
      font-size: 1.2rem;
      margin: 0;
    }
    .chosen {
      padding-left: 1.3rem;
      margin: 0.5rem 0;
    }
    .chosen li {
      padding: 0.3rem 0;
    }
    .chosen li > * {
      margin-right: 0.6rem;
    }
  `,
})
export class AdminPaths {
  private readonly api = inject(AdminApi);
  private readonly toasts = inject(Toasts);

  protected readonly paths = signal<AdminPath[]>([]);
  protected readonly courses = signal<AdminCourse[]>([]);
  protected form: PathForm = { ...EMPTY, courseIds: [] };

  constructor() {
    this.reload();
    this.api.courses().subscribe((courses) => this.courses.set(courses));
  }

  private reload(): void {
    this.api.paths().subscribe((paths) => this.paths.set(paths));
  }

  protected titleOf(courseId: number): string {
    return this.courses().find((course) => course.id === courseId)?.title ?? `Curso ${courseId}`;
  }

  protected add(courseId: number | null): void {
    if (courseId !== null) {
      this.form.courseIds.push(courseId);
    }
  }

  protected move(index: number, delta: number): void {
    const ids = this.form.courseIds;
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
  }

  protected edit(path: AdminPath): void {
    this.form = { ...path, courseIds: [...path.courseIds] };
  }

  protected reset(): void {
    this.form = { ...EMPTY, courseIds: [] };
  }

  protected save(): void {
    this.api.savePath(this.form.id, this.form).subscribe({
      next: () => {
        this.toasts.ok('Ruta guardada');
        this.reset();
        this.reload();
      },
      error: (error: unknown) => this.toasts.error(error),
    });
  }

  protected remove(path: AdminPath): void {
    if (!confirm(`¿Borrar la ruta «${path.title}»? Los cursos no se borran.`)) {
      return;
    }
    this.api.deletePath(path.id).subscribe({
      next: () => {
        this.toasts.ok('Ruta borrada');
        this.reload();
      },
      error: (error: unknown) => this.toasts.error(error),
    });
  }
}
