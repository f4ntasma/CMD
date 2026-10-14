import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { ContentApi } from '../core/api';
import { SITE_NAME, SITE_URL, Seo } from '../core/seo';
import { PostType } from '../core/models';
import { ShortDatePipe } from '../shared/format';
import { loader } from '../shared/loader';

/** Listado del blog (/blog) y de noticias (/noticias); la ruta indica el tipo. */
@Component({
  selector: 'app-posts',
  imports: [RouterLink, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <header class="page-title">
        <span class="eyebrow">{{ isNews() ? 'Noticias' : 'Blog' }}</span>
        <h1>{{ isNews() ? 'Novedades de la academia' : 'Artículos y tutoriales' }}</h1>
        <p>{{ isNews() ? 'Lanzamientos de cursos, eventos y avisos de la comunidad.' : 'Guías, consejos y apuntes para seguir aprendiendo fuera de los cursos.' }}</p>
      </header>

      @if (posts.value(); as page) {
        <div class="grid">
          @for (post of page.content; track post.id) {
            <a class="card hover post" [routerLink]="['/publicaciones', post.slug]">
              @if (post.coverUrl; as cover) {
                <img [src]="cover" alt="" loading="lazy" />
              }
              <h2>{{ post.title }}</h2>
              <p class="muted">{{ post.excerpt }}</p>
              <span class="muted mono meta">{{ post.authorName }} · {{ post.publishedAt | shortDate }}</span>
            </a>
          } @empty {
            <div class="empty">
              <img src="/mascot/spriteConcentrated.webp" alt="" />
              <p>Todavía no hay publicaciones. ¡Estamos escribiendo!</p>
            </div>
          }
        </div>
        @if (page.totalPages > 1) {
          <nav class="row pager">
            <button class="btn ghost small" [disabled]="page.page === 0" (click)="go(page.page)">← Anterior</button>
            <span class="muted mono">Página {{ page.page + 1 }} de {{ page.totalPages }}</span>
            <button class="btn ghost small" [disabled]="page.page + 1 >= page.totalPages" (click)="go(page.page + 2)">Siguiente →</button>
          </nav>
        }
      } @else if (posts.loading()) {
        <div class="skeleton"></div>
      } @else {
        <p class="alert error">No se pudieron cargar las publicaciones. <button class="link-btn" (click)="posts.reload()">Reintentar</button></p>
      }
    </div>
  `,
  styles: `
    .post {
      color: var(--text);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .post img {
      border-radius: var(--radius-sm);
      aspect-ratio: 16 / 9;
      object-fit: cover;
    }
    .post h2 {
      font-size: 1.25rem;
      margin: 0;
    }
    .post p {
      flex: 1;
      margin: 0;
    }
    .meta {
      font-size: 0.76rem;
    }
    .pager {
      justify-content: center;
      margin-top: 2rem;
    }
  `,
})
export class Posts {
  private readonly api = inject(ContentApi);
  private readonly router = inject(Router);

  /** Viene de los datos de la ruta. */
  readonly type = input.required<PostType>();
  readonly pagina = input<string>();

  protected readonly isNews = computed(() => this.type() === 'NEWS');
  private readonly query = computed(() => ({ type: this.type(), page: Math.max(Number(this.pagina() ?? 1) - 1, 0) || 0 }));
  protected readonly posts = loader(this.query, (query) => this.api.posts(query.type, query.page));

  protected go(page: number): void {
    void this.router.navigate([], { queryParams: { pagina: page }, queryParamsHandling: 'merge' });
  }
}

@Component({
  selector: 'app-post-detail',
  imports: [RouterLink, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container article">
      @if (post.value(); as data) {
        <a class="muted" [routerLink]="data.post.type === 'NEWS' ? '/noticias' : '/blog'">
          ← {{ data.post.type === 'NEWS' ? 'Noticias' : 'Blog' }}
        </a>
        <h1>{{ data.post.title }}</h1>
        <p class="muted mono meta">{{ data.post.authorName }} · {{ data.post.publishedAt | shortDate }}</p>
        @if (data.post.coverUrl; as cover) {
          <img class="cover" [src]="cover" alt="" />
        }
        <div class="prose" [innerHTML]="data.contentHtml"></div>
      } @else if (!post.loading()) {
        <div class="empty">
          <img src="/mascot/spriteThink.webp" alt="" />
          <h2>No encontramos esa publicación</h2>
          <a class="btn" routerLink="/blog">Ir al blog</a>
        </div>
      }
    </div>
  `,
  styles: `
    .article {
      max-width: 780px;
      padding-top: 2rem;
    }
    h1 {
      margin-top: 1rem;
    }
    .meta {
      font-size: 0.8rem;
    }
    .cover {
      border-radius: var(--radius);
      margin: 1rem 0;
      width: 100%;
    }
  `,
})
export class PostDetailPage {
  private readonly api = inject(ContentApi);
  private readonly title = inject(Title);
  private readonly seo = inject(Seo);
  readonly slug = input.required<string>();
  protected readonly post = loader(this.slug, (slug) => this.api.post(slug));

  constructor() {
    effect(() => {
      const data = this.post.value();
      if (data) {
        const post = data.post;
        const title = `${post.title} · Monkey Coffe Dev's`;
        this.title.setTitle(title);
        this.seo.update({
          title,
          description: post.excerpt,
          image: post.coverUrl,
          type: 'article',
          jsonLd: {
            '@type': post.type === 'NEWS' ? 'NewsArticle' : 'Article',
            headline: post.title,
            description: post.excerpt,
            image: post.coverUrl ?? undefined,
            datePublished: post.publishedAt,
            inLanguage: 'es',
            mainEntityOfPage: `${SITE_URL}/publicaciones/${post.slug}`,
            author: { '@type': 'Person', name: post.authorName },
            publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
          },
        });
      }
    });
  }
}
