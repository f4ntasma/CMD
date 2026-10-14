import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, CatalogApi } from '../../core/api';
import { Category } from '../../core/models';
import { Toasts } from '../../core/toasts';

interface CategoryForm {
  id: number | null;
  name: string;
  slug: string;
  description: string;
  color: string;
  position: number;
}

const EMPTY: CategoryForm = { id: null, name: '', slug: '', description: '', color: '#F04E23', position: 0 };

@Component({
  selector: 'app-admin-categories',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Categorías</h1>
    <div class="grid-2">
      <div class="card table-wrap">
        <table>
          <thead><tr><th>Orden</th><th>Nombre</th><th>Dirección</th><th></th></tr></thead>
          <tbody>
            @for (category of categories(); track category.id) {
              <tr>
                <td class="mono">{{ category.position }}</td>
                <td><span class="dot" [style.background]="category.color"></span> {{ category.name }}</td>
                <td class="mono muted">{{ category.slug }}</td>
                <td class="num">
                  <button class="link-btn" type="button" (click)="edit(category)">Editar</button> ·
                  <button class="link-btn" type="button" (click)="remove(category)">Borrar</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <form class="card stack" (ngSubmit)="save()">
        <h2>{{ form.id ? 'Editar categoría' : 'Nueva categoría' }}</h2>
        <label>Nombre <input type="text" name="name" [(ngModel)]="form.name" required maxlength="80" /></label>
        <label>Dirección (slug)
          <input type="text" name="slug" [(ngModel)]="form.slug" maxlength="80" />
          <span class="hint">Déjala vacía para generarla desde el nombre.</span>
        </label>
        <label>Descripción <input type="text" name="description" [(ngModel)]="form.description" maxlength="300" /></label>
        <div class="form-row">
          <label>Color <input type="text" name="color" [(ngModel)]="form.color" required pattern="#[0-9A-Fa-f]{6}" /></label>
          <label>Orden <input type="number" name="position" [(ngModel)]="form.position" /></label>
        </div>
        <div class="row">
          <button class="btn" type="submit" [disabled]="!form.name.trim()">Guardar</button>
          @if (form.id) {
            <button class="btn ghost" type="button" (click)="reset()">Cancelar</button>
          }
        </div>
      </form>
    </div>
  `,
  styles: `
    .dot {
      display: inline-block;
      width: 0.7rem;
      height: 0.7rem;
      border-radius: 50%;
    }
    h2 {
      font-size: 1.2rem;
      margin: 0;
    }
  `,
})
export class AdminCategories {
  private readonly api = inject(AdminApi);
  private readonly catalog = inject(CatalogApi);
  private readonly toasts = inject(Toasts);

  protected readonly categories = signal<Category[]>([]);
  protected form: CategoryForm = { ...EMPTY };

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.catalog.categories().subscribe((categories) => this.categories.set(categories));
  }

  protected edit(category: Category): void {
    this.form = { ...category, description: category.description ?? '' };
  }

  protected reset(): void {
    this.form = { ...EMPTY };
  }

  protected save(): void {
    this.api.saveCategory(this.form.id, this.form).subscribe({
      next: () => {
        this.toasts.ok('Categoría guardada');
        this.reset();
        this.reload();
      },
      error: (error: unknown) => this.toasts.error(error),
    });
  }

  protected remove(category: Category): void {
    if (!confirm(`¿Borrar la categoría «${category.name}»?`)) {
      return;
    }
    this.api.deleteCategory(category.id).subscribe({
      next: () => {
        this.toasts.ok('Categoría borrada');
        this.reload();
      },
      error: (error: unknown) => this.toasts.error(error),
    });
  }
}
