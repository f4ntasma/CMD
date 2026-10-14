import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { CatalogApi, ContentApi } from '../core/api';
import { Site } from '../core/site';
import { CourseCardComponent } from '../shared/course-card';
import { ShortDatePipe } from '../shared/format';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CourseCardComponent, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container hero">
      <div>
        <span class="eyebrow">Academia en línea · En español</span>
        <h1>Aprende a programar con <span class="hl">código, café</span> y comunidad</h1>
        <p class="lead muted">
          Cursos prácticos de programación, POO, bases de datos, ciberseguridad e inteligencia artificial.
          Avanza a tu ritmo, resuelve cuestionarios y llévate tu certificado.
        </p>
        <div class="row">
          <a class="btn" routerLink="/cursos">Explorar cursos</a>
          @if (site.settings()['discord_invite_url']; as invite) {
            <a class="btn blue" [href]="invite" target="_blank" rel="noopener noreferrer">Únete al Discord</a>
          } @else {
            <a class="btn ghost" routerLink="/rutas">Ver rutas de aprendizaje</a>
          }
        </div>
        <ul class="perks mono">
          <li>✓ Cursos gratuitos y premium</li>
          <li>✓ Certificado verificable</li>
          <li>✓ Dudas resueltas en cada clase</li>
        </ul>
      </div>
      <div class="hero-art">
        <div class="glow"></div>
        <img class="float" src="/mascot/spriteCool.png" alt="Mascota de Monkey Coffe Dev's: un mono con lentes y una taza de café"
             width="480" height="510" fetchpriority="high" />
      </div>
    </section>

    <section class="container section">
      <div class="section-head">
        <div><span class="eyebrow">Qué vas a aprender</span><h2>Elige tu camino</h2></div>
      </div>
      <div class="categories">
        @for (category of categories(); track category.id) {
          <a class="card hover category" [routerLink]="['/cursos']" [queryParams]="{ categoria: category.slug }"
             [style.--accent]="category.color">
            <span class="dot"></span>
            <h3>{{ category.name }}</h3>
            <p class="muted">{{ category.description }}</p>
          </a>
        }
      </div>
    </section>

    @if (featured().length > 0) {
      <section class="container section">
        <div class="section-head">
          <div><span class="eyebrow">Destacados</span><h2>Cursos para empezar hoy</h2></div>
          <a routerLink="/cursos">Ver todos los cursos →</a>
        </div>
        <div class="grid">
          @for (course of featured(); track course.id) {
            <app-course-card [course]="course" />
          }
        </div>
      </section>
    }

    @if (paths().length > 0) {
      <section class="container section">
        <div class="panel paths">
          <img src="/mascot/spriteHaveIdea.png" alt="" width="190" height="190" loading="lazy" />
          <div>
            <span class="eyebrow">Rutas de aprendizaje</span>
            <h2>¿No sabes por dónde empezar?</h2>
            <p class="muted">Sigue una ruta: cursos ordenados para llevarte de cero a un objetivo concreto.</p>
            <div class="row">
              @for (path of paths(); track path.id) {
                <a class="btn ghost small" [routerLink]="['/rutas', path.slug]">{{ path.title }} · {{ path.courseCount }} cursos</a>
              }
            </div>
          </div>
        </div>
      </section>
    }

    @if (videos().length > 0) {
      <section class="container section">
        <div class="section-head">
          <div><span class="eyebrow">YouTube</span><h2>Lo último del canal</h2></div>
          @if (site.settings()['youtube_url']; as youtube) {
            <a [href]="youtube" target="_blank" rel="noopener noreferrer">Ir al canal →</a>
          }
        </div>
        <div class="grid">
          @for (video of videos(); track video.id) {
            <a class="card hover video" [href]="'https://www.youtube.com/watch?v=' + video.id" target="_blank"
               rel="noopener noreferrer">
              <div class="thumb"><img [src]="video.thumbnailUrl" alt="" loading="lazy" /><span class="play">▶</span></div>
              <h3>{{ video.title }}</h3>
              <span class="muted mono date">{{ video.publishedAt | shortDate }}</span>
            </a>
          }
        </div>
      </section>
    }

    <section class="container section">
      <div class="panel community">
        <div>
          <span class="eyebrow">Comunidad</span>
          <h2>No aprendas solo</h2>
          <p class="muted">
            Comparte tus avances, pide ayuda cuando te atasques y entérate primero de los cursos nuevos.
          </p>
          @if (discord(); as server) {
            <p class="online mono"><span class="pulse"></span>{{ server.onlineCount }} personas en línea en {{ server.name }}</p>
          }
          <div class="row">
            @for (link of site.socialLinks(); track link.label) {
              <a class="btn" [class.blue]="link.label === 'Discord'" [class.ghost]="link.label !== 'Discord'"
                 [href]="link.url" target="_blank" rel="noopener noreferrer">{{ link.label }}</a>
            } @empty {
              <a class="btn" routerLink="/registro">Crear mi cuenta</a>
            }
          </div>
        </div>
        <img src="/mascot/spriteLaugh.png" alt="" width="230" height="230" loading="lazy" />
      </div>
    </section>

    @if (posts().length > 0) {
      <section class="container section">
        <div class="section-head">
          <div><span class="eyebrow">Blog y noticias</span><h2>Lo más reciente</h2></div>
          <a routerLink="/blog">Ver el blog →</a>
        </div>
        <div class="grid">
          @for (post of posts(); track post.id) {
            <a class="card hover post" [routerLink]="['/publicaciones', post.slug]">
              <span class="badge" [class.brand]="post.type === 'NEWS'">{{ post.type === 'NEWS' ? 'Noticia' : 'Artículo' }}</span>
              <h3>{{ post.title }}</h3>
              <p class="muted">{{ post.excerpt }}</p>
              <span class="muted mono date">{{ post.publishedAt | shortDate }}</span>
            </a>
          }
        </div>
      </section>
    }
  `,
  styles: `
    .hero {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 2rem;
      align-items: center;
      padding-top: clamp(2rem, 6vw, 4.5rem);
      padding-bottom: 2rem;
    }
    .hl {
      background: linear-gradient(90deg, var(--brand-strong), var(--gold));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .lead {
      font-size: 1.12rem;
      max-width: 54ch;
    }
    .perks {
      list-style: none;
      padding: 0;
      margin: 1.6rem 0 0;
      display: flex;
      gap: 1.2rem;
      flex-wrap: wrap;
      font-size: 0.8rem;
      color: var(--muted);
    }
    .hero-art {
      position: relative;
      display: grid;
      place-items: center;
    }
    .hero-art img {
      position: relative;
      width: min(420px, 100%);
      height: auto;
      filter: drop-shadow(0 24px 30px rgb(0 0 0 / 55%));
    }
    .glow {
      position: absolute;
      width: 78%;
      aspect-ratio: 1;
      border-radius: 50%;
      background: radial-gradient(circle, rgb(240 78 35 / 38%), rgb(61 99 221 / 22%) 55%, transparent 72%);
      filter: blur(8px);
    }
    .categories {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
    .category {
      color: var(--text);
      border-top: 3px solid var(--accent);
    }
    .category p {
      font-size: 0.9rem;
      margin: 0;
    }
    .dot {
      display: block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 18px var(--accent);
      margin-bottom: 0.9rem;
    }
    .paths,
    .community {
      display: flex;
      align-items: center;
      gap: 2rem;
    }
    .community {
      justify-content: space-between;
    }
    .paths img,
    .community img {
      height: auto;
      flex-shrink: 0;
    }
    .online {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--ok);
    }
    .pulse {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--ok);
      box-shadow: 0 0 0 4px rgb(62 207 142 / 22%);
    }
    .video,
    .post {
      color: var(--text);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .video h3,
    .post h3 {
      margin: 0;
      font-size: 1.05rem;
    }
    .post p {
      margin: 0;
      font-size: 0.93rem;
      flex: 1;
    }
    .post .badge {
      align-self: flex-start;
    }
    .thumb {
      position: relative;
      aspect-ratio: 16 / 9;
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: #000;
    }
    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .play {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      font-size: 2rem;
      color: #fff;
      background: rgb(0 0 0 / 28%);
    }
    .date {
      font-size: 0.76rem;
    }
    @media (max-width: 860px) {
      .hero {
        grid-template-columns: 1fr;
      }
      .hero-art {
        order: -1;
      }
      .hero-art img {
        width: 240px;
      }
      .paths,
      .community {
        flex-direction: column;
        text-align: left;
        align-items: flex-start;
      }
      .paths img,
      .community img {
        width: 140px;
      }
    }
  `,
})
export class Home {
  private readonly catalog = inject(CatalogApi);
  private readonly content = inject(ContentApi);
  protected readonly site = inject(Site);

  // Cada bloque es independiente: si uno falla, el resto de la portada se muestra igual.
  protected readonly categories = toSignal(this.catalog.categories().pipe(catchError(() => of([]))), { initialValue: [] });
  protected readonly featured = toSignal(this.catalog.featured().pipe(catchError(() => of([]))), { initialValue: [] });
  protected readonly paths = toSignal(this.catalog.paths().pipe(catchError(() => of([]))), { initialValue: [] });
  protected readonly videos = toSignal(this.content.videos().pipe(catchError(() => of([]))), { initialValue: [] });
  protected readonly discord = toSignal(this.content.discord().pipe(catchError(() => of(null))), { initialValue: null });
  protected readonly posts = toSignal(
    this.content.posts(null, 0, 3).pipe(
      map((page) => page.content),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );
}
