import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/api';
import { Auth } from '../../core/auth';
import { AdminCourse, AdminUser, Role } from '../../core/models';
import { Toasts } from '../../core/toasts';
import { ShortDatePipe } from '../../shared/format';

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Usuarios</h1>
    <form class="row search" (ngSubmit)="search()">
      <input type="search" name="q" [(ngModel)]="query" placeholder="Buscar por nombre o correo" aria-label="Buscar usuarios" />
      <button class="btn" type="submit">Buscar</button>
    </form>

    <div class="card table-wrap">
      <table>
        <thead><tr><th>Usuario</th><th>Alta</th><th>Rol</th><th>Estado</th><th>Regalar curso</th></tr></thead>
        <tbody>
          @for (user of users(); track user.id) {
            <tr>
              <td>{{ user.displayName }}<div class="muted small">{{ user.email }}{{ user.emailVerified ? '' : ' · sin confirmar' }}</div></td>
              <td>{{ user.createdAt | shortDate }}</td>
              <td>
                <select [ngModel]="user.role" (ngModelChange)="update(user, $event, user.enabled)" [disabled]="user.id === me()"
                        [attr.aria-label]="'Rol de ' + user.displayName">
                  <option value="STUDENT">Estudiante</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </td>
              <td>
                <button class="btn small" type="button" [class.ghost]="user.enabled" [class.danger]="!user.enabled"
                        [disabled]="user.id === me()" (click)="update(user, user.role, !user.enabled)">
                  {{ user.enabled ? 'Activo' : 'Desactivado' }}
                </button>
              </td>
              <td>
                <select [ngModel]="null" (ngModelChange)="grant(user, $event)" [attr.aria-label]="'Regalar un curso a ' + user.displayName">
                  <option [ngValue]="null">Elegir curso…</option>
                  @for (course of courses(); track course.id) {
                    <option [ngValue]="course.id">{{ course.title }}</option>
                  }
                </select>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="muted">No hay usuarios que coincidan.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .search {
      margin-bottom: 1rem;
    }
    .search input {
      max-width: 360px;
    }
    .small {
      font-size: 0.8rem;
    }
    td select {
      min-width: 150px;
    }
  `,
})
export class AdminUsers {
  private readonly api = inject(AdminApi);
  private readonly toasts = inject(Toasts);
  private readonly auth = inject(Auth);

  protected query = '';
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly courses = signal<AdminCourse[]>([]);
  protected readonly me = () => this.auth.user()?.id;

  constructor() {
    this.search();
    this.api.courses().subscribe((courses) => this.courses.set(courses));
  }

  protected search(): void {
    this.api.users(this.query).subscribe({ next: (page) => this.users.set(page.content), error: (e: unknown) => this.toasts.error(e) });
  }

  protected update(user: AdminUser, role: Role, enabled: boolean): void {
    this.api.updateUser(user.id, role, enabled).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
        this.toasts.ok('Usuario actualizado');
      },
      error: (error: unknown) => {
        this.toasts.error(error);
        this.search();
      },
    });
  }

  protected grant(user: AdminUser, courseId: number | null): void {
    const course = this.courses().find((item) => item.id === courseId);
    if (!course || !confirm(`¿Dar a ${user.displayName} acceso gratuito a «${course.title}»?`)) {
      this.search();
      return;
    }
    this.api.grantCourse(user.id, course.id).subscribe({
      next: () => this.toasts.ok(`${user.displayName} ya tiene acceso a «${course.title}»`),
      error: (error: unknown) => this.toasts.error(error),
    });
  }
}
