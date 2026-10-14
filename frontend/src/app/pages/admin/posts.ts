import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../core/api';
import { AdminPost, PostType } from '../../core/models';
import { Toasts } from '../../core/toasts';
import { ShortDatePipe } from '../../shared/format';

interface PostForm {
  id: number | null;
  type: PostType;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  published: boolean;
}

const EMPTY: PostForm = { id: null, type: 'ARTICLE', title: '', slug: '', excerpt: '', content: '', coverUrl: '', published: false };

@Component({
  selector: 'app-admin-posts',
  imports: [FormsModule, RouterLink, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Blog y noticias</h1>

    <form class="card stack" (ngSubmit)="save()">
      <h2>{{ form.id ? 'Editar publicación' : 'Nueva publicación' }}</h2>
      <div class="form-row">
        <label>Tipo
          <select name="type" [(ngModel)]="form.type">
            <option value="ARTICLE">Artículo del blog</option>
            <option value="NEWS">Noticia</option>
          </select>
        </label>
        <label>Título <input type="text" name="title" [(ngModel)]="form.title" required maxlength="160" /></label>
      </div>
      <label>Extracto
        <input type="text" name="excerpt" [(ngModel)]="form.excerpt" required maxlength="300" />
        <span class="hint">Una o dos frases que se muestran en los listados.</span>
      </label>
      <label>Contenido (Markdown) <textarea name="content" [(ngModel)]="form.content" rows="12"></textarea></label>
      <div class="form-row">
        <label>Portada (enlace) <input type="url" name="coverUrl" [(ngModel)]="form.coverUrl" placeholder="https://…" /></label>
        <label class="check"><input type="checkbox" name="published" [(ngModel)]="form.published" /> Publicada</label>
      </div>
      <div class="row">
        <button class="btn" type="submit" [disabled]="!form.title.trim() || !form.excerpt.trim()">Guardar</button>
        @if (form.id) {
          <button class="btn ghost" type="button" (click)="reset()">Cancelar</button>
        }
      </div>
    </form>

    <div class="card table-wrap list">
      <table>
        <thead><tr><th>Título</th><th>Tipo</th><th>Estado</th><th>Publicada</th><th></th></tr></thead>
        <tbody>
          @for (post of posts(); track post.id) {
            <tr>
              <td>
                @if (post.published) {
                  <a [routerLink]="['/publicaciones', post.slug]">{{ post.title }}</a>
                } @else {
                  {{ post.title }}
                }
              </td>
              <td>{{ post.type === 'NEWS' ? 'Noticia' : 'Artículo' }}</td>
              <td><span class="badge" [class.ok]="post.published">{{ post.published ? 'Publicada' : 'Borrador' }}</span></td>
              <td>{{ post.publishedAt | shortDate }}</td>
              <td class="num">
                <button class="link-btn" type="button" (click)="edit(post)">Editar</button> ·
                <button class="link-btn" type="button" (click)="remove(post)">Borrar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="muted">Aún no hay publicaciones.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    h2 {
      font-size: 1.2rem;
      margin: 0;
    }
    .list {
      margin-top: 1.25rem;
    }
  `,
})
export class AdminPosts {
  private readonly api = inject(AdminApi);
  private readonly toasts = inject(Toasts);

  protected readonly posts = signal<AdminPost[]>([]);
  protected form: PostForm = { ...EMPTY };

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.api.posts().subscribe((page) => this.posts.set(page.content));
  }

  protected edit(post: AdminPost): void {
    this.form = { ...post, coverUrl: post.coverUrl ?? '' };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected reset(): void {
    this.form = { ...EMPTY };
  }

  protected save(): void {
    this.api.savePost(this.form.id, this.form).subscribe({
      next: () => {
        this.toasts.ok('Publicación guardada');
        this.reset();
        this.reload();
      },
      error: (error: unknown) => this.toasts.error(error),
    });
  }

  protected remove(post: AdminPost): void {
    if (!confirm(`¿Borrar «${post.title}»?`)) {
      return;
    }
    this.api.deletePost(post.id).subscribe({
      next: () => {
        this.toasts.ok('Publicación borrada');
        this.reload();
      },
      error: (error: unknown) => this.toasts.error(error),
    });
  }
}
