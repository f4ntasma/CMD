import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../core/api';
import { AdminComment } from '../../core/models';
import { Toasts } from '../../core/toasts';
import { ShortDatePipe } from '../../shared/format';

@Component({
  selector: 'app-admin-comments',
  imports: [RouterLink, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Comentarios</h1>
    <p class="muted">Los más recientes primero. Ocultar un comentario lo quita de la clase sin borrarlo.</p>
    <div class="stack">
      @for (comment of comments(); track comment.id) {
        <div class="card" [class.dim]="comment.hidden">
          <div class="spread">
            <div>
              <strong>{{ comment.authorName }}</strong> <span class="muted">{{ comment.authorEmail }}</span>
              <div class="muted small">
                {{ comment.createdAt | shortDate }} ·
                <a [routerLink]="['/cursos', comment.courseSlug, 'clase', comment.lessonId]">{{ comment.courseTitle }} › {{ comment.lessonTitle }}</a>
              </div>
            </div>
            <button class="btn ghost small" type="button" (click)="toggle(comment)">{{ comment.hidden ? 'Mostrar' : 'Ocultar' }}</button>
          </div>
          <p class="text">{{ comment.body }}</p>
        </div>
      } @empty {
        <p class="muted">Aún no hay comentarios.</p>
      }
    </div>
  `,
  styles: `
    .small {
      font-size: 0.8rem;
    }
    .text {
      margin: 0.7rem 0 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .dim {
      opacity: 0.55;
    }
  `,
})
export class AdminComments {
  private readonly api = inject(AdminApi);
  private readonly toasts = inject(Toasts);
  protected readonly comments = signal<AdminComment[]>([]);

  constructor() {
    this.api.comments().subscribe({ next: (page) => this.comments.set(page.content), error: (e: unknown) => this.toasts.error(e) });
  }

  protected toggle(comment: AdminComment): void {
    const hidden = !comment.hidden;
    this.api.setCommentHidden(comment.id, hidden).subscribe({
      next: () => this.comments.update((list) => list.map((item) => (item.id === comment.id ? { ...item, hidden } : item))),
      error: (error: unknown) => this.toasts.error(error),
    });
  }
}
