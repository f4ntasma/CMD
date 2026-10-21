import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { CatalogApi, ContentApi } from '../core/api';
import { Site } from '../core/site';
import { CourseCardComponent } from '../shared/course-card';
import { ShortDatePipe } from '../shared/format';
import { Icon, IconName, categoryIcon } from '../shared/icon';

const SOCIAL_ICONS: Record<string, IconName> = { Discord: 'message', YouTube: 'video', TikTok: 'music', GitHub: 'github' };

@Component({
  selector: 'app-home',
  imports: [RouterLink, CourseCardComponent, ShortDatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Portada -->
    <section class="container hero">
      <div class="hero-copy">
        <span class="pill"><span class="pill-icon"><app-icon name="coffee" [size]="15" /></span>Academia en línea · 100% en español</span>
        <h1>Aprende a programar con <span class="hl">código, café</span> y comunidad</h1>
        <p class="lead">
          Cursos prácticos de programación, POO, bases de datos, ciberseguridad e inteligencia artificial.
          Avanza a tu ritmo, resuelve cuestionarios y llévate tu certificado.
        </p>
        <div class="row cta">
          <a class="btn big" routerLink="/cursos">Explorar cursos <app-icon name="arrow-right" [size]="18" [stroke]="2.4" /></a>
          <a class="btn ghost big" routerLink="/rutas"><app-icon class="neon" name="route" [size]="18" /> Ver rutas de aprendizaje</a>
        </div>
        <ul class="perks">
          <li><app-icon name="check" [size]="18" [stroke]="2.6" />Cursos gratuitos y premium</li>
          <li><app-icon name="check" [size]="18" [stroke]="2.6" />Certificado verificable</li>
          <li><app-icon name="check" [size]="18" [stroke]="2.6" />Dudas resueltas en cada clase</li>
        </ul>
      </div>
      <div class="hero-art">
        <div class="orb" aria-hidden="true"></div>
        <img class="float mascot" src="/mascot/spriteCool.webp" width="591" height="640" fetchpriority="high"
             alt="Mascota de Monkey Coffe Dev's: un mono rojo con lentes oscuros y una taza de café" />
        <div class="code-card mono" aria-hidden="true">
          <div class="dots"><span></span><span></span><span></span></div>
          <div><span class="kw">while</span> aprendiendo:</div>
          <div class="in">cafe.<span class="fn">recargar</span>()</div>
          <div class="in">codigo.<span class="fn">mejorar</span>()</div>
        </div>
        <div class="cert-chip">
          <span class="cert-icon"><app-icon name="award" [size]="20" /></span>
          <span><strong>Certificado</strong><small>verificable en línea</small></span>
        </div>
      </div>
    </section>

    <!-- Categorías -->
    @if (categories().length > 0) {
      <section class="container section">
        <span class="eyebrow">Qué vas a aprender</span>
        <h2>Elige tu camino</h2>
        <div class="categories">
          @for (category of categories(); track category.id) {
            <a class="card hover category" [routerLink]="['/cursos']" [queryParams]="{ categoria: category.slug }"
               [style.--accent]="category.color">
              <span class="cat-icon"><app-icon [name]="icon(category.slug)" [size]="26" /></span>
              <h3>{{ category.name }}</h3>
              <p class="muted">{{ category.description }}</p>
            </a>
          }
        </div>
      </section>
    }

    <!-- Cómo funciona -->
    <section class="container section">
      <div class="how">
        <img src="/mascot/spriteConcentrated.webp" width="640" height="541" loading="lazy"
             alt="La mascota concentrada programando en su laptop" />
        <div class="how-copy">
          <span class="eyebrow dark">Cómo funciona</span>
          <h2>De cero a tu certificado, a tu ritmo</h2>
          <ol class="steps">
            <li>
              <span class="step-head"><span class="step-icon cobalt"><app-icon name="book" [size]="22" /></span><span class="mono">01</span></span>
              <strong>Elige un curso</strong>
              <span>Gratuito o premium, según lo que quieras aprender.</span>
            </li>
            <li>
              <span class="step-head"><span class="step-icon red"><app-icon name="play-circle" [size]="22" /></span><span class="mono">02</span></span>
              <strong>Aprende y practica</strong>
              <span>Clases en video y cuestionarios al final de cada tema.</span>
            </li>
            <li>
              <span class="step-head"><span class="step-icon black"><app-icon name="award" [size]="22" /></span><span class="mono">03</span></span>
              <strong>Obtén tu certificado</strong>
              <span>Con un código que cualquiera puede verificar en línea.</span>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- Cursos destacados -->
    @if (featured().length > 0) {
      <section class="container section">
        <div class="section-head">
          <div><span class="eyebrow">Destacados</span><h2>Cursos para empezar hoy</h2></div>
          <a class="more" routerLink="/cursos">Ver todos los cursos <app-icon name="arrow-right" [size]="18" [stroke]="2.4" /></a>
        </div>
        <div class="grid">
          @for (course of featured(); track course.id) {
            <app-course-card [course]="course" />
          }
        </div>
      </section>
    }

    <!-- Rutas -->
    @if (paths().length > 0) {
      <section class="container section">
        <div class="paths">
          <img src="/mascot/spriteHaveIdea.webp" width="578" height="640" loading="lazy"
               alt="La mascota con una idea, señalando hacia arriba junto a un foco encendido" />
          <div>
            <span class="eyebrow">Rutas de aprendizaje</span>
            <h2>¿No sabes por dónde empezar?</h2>
            <p class="muted">Sigue una ruta: cursos ordenados para llevarte de cero a un objetivo concreto.</p>
            <div class="row">
              @for (path of paths(); track path.id) {
                <a class="path-chip" [routerLink]="['/rutas', path.slug]">{{ path.title }} <span class="mono">{{ path.courseCount }} cursos</span></a>
              }
            </div>
          </div>
        </div>
      </section>
    }

    <!-- Videos -->
    @if (videos().length > 0) {
      <section class="container section">
        <div class="section-head">
          <div><span class="eyebrow">YouTube</span><h2>Lo último del canal</h2></div>
          @if (site.settings()['youtube_url']; as youtube) {
            <a class="more" [href]="youtube" target="_blank" rel="noopener noreferrer">Ir al canal <app-icon name="arrow-right" [size]="18" [stroke]="2.4" /></a>
          }
        </div>
        <div class="grid">
          @for (video of videos(); track video.id) {
            <a class="card hover video" [href]="'https://www.youtube.com/watch?v=' + video.id" target="_blank" rel="noopener noreferrer">
              <div class="thumb">
                <img [src]="video.thumbnailUrl" alt="" loading="lazy" />
                <span class="play"><app-icon name="play" [size]="26" /></span>
              </div>
              <h3>{{ video.title }}</h3>
              <span class="muted mono date">{{ video.publishedAt | shortDate }}</span>
            </a>
          }
        </div>
      </section>
    }

    <!-- Comunidad -->
    <section class="container section">
      <div class="panel community">
        <div>
          <span class="eyebrow">Comunidad</span>
          <h2>No aprendas solo</h2>
          <p class="muted lead-sm">Comparte tus avances, pide ayuda cuando te atasques y entérate primero de los cursos nuevos.</p>
          @if (discord(); as server) {
            <p class="online mono"><span class="pulse"></span>{{ server.onlineCount }} personas en línea en {{ server.name }}</p>
          }
          <div class="row">
            @for (link of site.socialLinks(); track link.label) {
              <a class="btn" [class.blue]="link.label === 'Discord'" [class.ghost]="link.label !== 'Discord'"
                 [href]="link.url" target="_blank" rel="noopener noreferrer">
                <app-icon [name]="socialIcon(link.label)" [size]="19" />{{ link.label === 'Discord' ? 'Únete al Discord' : link.label }}
              </a>
            } @empty {
              <a class="btn" routerLink="/registro">Crear mi cuenta</a>
            }
          </div>
        </div>
        <img src="/mascot/spriteLaugh.webp" width="640" height="626" loading="lazy" alt="La mascota riéndose, con su café en la cola" />
      </div>
    </section>

    <!-- Blog -->
    @if (posts().length > 0) {
      <section class="container section">
        <div class="section-head">
          <div><span class="eyebrow">Blog y noticias</span><h2>Lo más reciente</h2></div>
          <a class="more" routerLink="/blog">Ver el blog <app-icon name="arrow-right" [size]="18" [stroke]="2.4" /></a>
        </div>
        <div class="grid">
          @for (post of posts(); track post.id) {
            <a class="card hover post" [routerLink]="['/publicaciones', post.slug]">
              <span class="badge" [class.brand]="post.type === 'NEWS'" [class.neon]="post.type !== 'NEWS'">{{ post.type === 'NEWS' ? 'Noticia' : 'Artículo' }}</span>
              <h3>{{ post.title }}</h3>
              <p class="muted">{{ post.excerpt }}</p>
              <span class="muted mono date">{{ post.publishedAt | shortDate }}</span>
            </a>
          }
        </div>
      </section>
    }

    <!-- Llamado final -->
    <section class="container section">
      <div class="final">
        <img src="/mascot/spriteThink.webp" width="498" height="640" loading="lazy" alt="La mascota pensando, con la mano en la barbilla" />
        <div class="final-copy">
          <h2>¿Listo para tu primera línea de código?</h2>
          <p>Crea tu cuenta gratis y empieza hoy, con café o sin él.</p>
        </div>
        <a class="btn dark big" routerLink="/registro">Crear mi cuenta gratis <app-icon name="arrow-right" [size]="18" [stroke]="2.4" /></a>
      </div>
    </section>
  `,
  styles: `
    h2 {
      margin-bottom: 1.6rem;
    }
    .section-head h2 {
      margin: 0;
    }
    .more {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-weight: 800;
    }

    /* Portada */
    .hero {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 2.5rem;
      align-items: center;
      padding-top: clamp(2.5rem, 6vw, 4.5rem);
      padding-bottom: 2rem;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.4rem;
      padding: 0.35rem 0.9rem 0.35rem 0.4rem;
      border-radius: 999px;
      background: var(--surface);
      border: 1px solid var(--line);
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--peach);
    }
    .pill-icon {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: rgb(244 162 107 / 14%);
    }
    .hero h1 {
      font-size: clamp(2.6rem, 6vw, 4.7rem);
      line-height: 1.02;
      letter-spacing: -0.035em;
      margin: 0;
    }
    .hl {
      color: var(--brand-strong);
    }
    .lead {
      margin: 1.5rem 0 0;
      max-width: 54ch;
      font-size: 1.15rem;
      color: #b6bed2;
    }
    .cta {
      margin-top: 2rem;
    }
    .btn.big {
      padding: 0.95rem 1.5rem;
      font-size: 1.05rem;
      border-radius: 14px;
    }
    .btn.big:not(.ghost):not(.dark) {
      box-shadow: 0 10px 30px -8px rgb(207 53 23 / 55%);
    }
    .btn.ghost.big {
      background: var(--surface);
    }
    .neon {
      color: var(--neon);
    }
    .perks {
      list-style: none;
      padding: 0;
      margin: 2rem 0 0;
      display: flex;
      gap: 0.8rem 1.6rem;
      flex-wrap: wrap;
      font-size: 0.95rem;
      font-weight: 600;
      color: #c9d0e4;
    }
    .perks li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .perks app-icon {
      color: var(--ok);
    }
    .hero-art {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 480px;
    }
    .orb {
      position: absolute;
      width: min(440px, 88%);
      aspect-ratio: 1;
      border-radius: 50%;
      background:
        radial-gradient(rgb(41 182 255 / 22%) 1.5px, transparent 1.5px) 0 0 / 18px 18px,
        radial-gradient(circle, #0a2540 0%, #04101c 62%, #000 100%);
      border: 2px solid rgb(41 182 255 / 70%);
      box-shadow:
        0 0 40px rgb(41 182 255 / 45%),
        0 0 120px rgb(41 182 255 / 22%),
        inset 0 0 60px rgb(41 182 255 / 25%);
    }
    .mascot {
      position: relative;
      width: min(440px, 100%);
      filter: drop-shadow(0 26px 30px rgb(0 0 0 / 70%));
    }
    .code-card {
      position: absolute;
      left: 0;
      bottom: 2rem;
      padding: 0.85rem 1rem;
      border-radius: 16px;
      background: rgb(5 8 13 / 92%);
      border: 1px solid rgb(41 182 255 / 40%);
      box-shadow:
        0 0 24px rgb(41 182 255 / 18%),
        0 18px 40px rgb(0 0 0 / 60%);
      font-size: 0.82rem;
      line-height: 1.7;
      color: var(--text);
    }
    .code-card .in {
      padding-left: 1.1rem;
    }
    .kw {
      color: var(--neon);
    }
    .fn {
      color: var(--peach);
    }
    .dots {
      display: flex;
      gap: 6px;
      margin-bottom: 0.45rem;
    }
    .dots span {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--brand-strong);
    }
    .dots span:nth-child(2) {
      background: var(--peach);
    }
    .dots span:nth-child(3) {
      background: var(--ok);
    }
    .cert-chip {
      position: absolute;
      right: 0;
      top: 2.5rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.7rem 1rem;
      border-radius: 16px;
      background: #f6f0e8;
      color: #0c1120;
      box-shadow: 0 18px 40px rgb(0 0 0 / 60%);
      line-height: 1.25;
    }
    .cert-chip strong,
    .cert-chip small {
      display: block;
    }
    .cert-chip small {
      font-size: 0.85rem;
      font-weight: 600;
      color: #4a5272;
    }
    .cert-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: #fde3d2;
      color: #c2301a;
    }

    /* Categorías */
    .categories {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
    .category {
      color: var(--text);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .category h3 {
      margin: 0;
      font-size: 1.3rem;
    }
    .category p {
      font-size: 0.93rem;
      margin: 0;
    }
    .cat-icon {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      color: color-mix(in srgb, var(--accent) 60%, white);
      background: color-mix(in srgb, var(--accent) 18%, transparent);
    }

    /* Cómo funciona */
    .how {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2.5rem;
      padding: clamp(1.75rem, 4vw, 3rem);
      border-radius: 28px;
      background: #f6f0e8;
      color: #0c1120;
    }
    .how > img {
      flex: 0 1 300px;
      width: 300px;
      max-width: 100%;
      margin-inline: auto;
    }
    .how-copy {
      flex: 1 1 480px;
      min-width: 0;
    }
    .eyebrow.dark {
      color: #b52d13;
    }
    .steps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    }
    .steps li {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      padding: 1.3rem;
      border-radius: 18px;
      background: #fff;
      border: 1px solid #e6dccd;
      font-size: 0.95rem;
      color: #4a4538;
    }
    .steps strong {
      font-size: 1.1rem;
      color: #0c1120;
    }
    .step-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #6b6458;
    }
    .step-icon {
      width: 44px;
      height: 44px;
      border-radius: 13px;
      display: grid;
      place-items: center;
      color: #fff;
    }
    .step-icon.cobalt {
      background: var(--blue);
    }
    .step-icon.red {
      background: #c2301a;
    }
    .step-icon.black {
      background: #000;
      color: var(--neon);
    }

    /* Rutas: el bloque más neón de la página */
    .paths {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2rem;
      padding: clamp(1.75rem, 4vw, 2.75rem) clamp(1.5rem, 4vw, 3rem);
      border-radius: 28px;
      background:
        radial-gradient(rgb(41 182 255 / 16%) 1.5px, transparent 1.5px) 0 0 / 20px 20px,
        radial-gradient(120% 140% at 0% 50%, #06233d 0%, #020a12 60%, #000 100%);
      border: 1px solid rgb(41 182 255 / 55%);
      box-shadow:
        0 0 40px -10px rgb(41 182 255 / 45%),
        inset 0 0 50px rgb(41 182 255 / 10%);
      overflow: hidden;
    }
    .paths > img {
      flex: 0 1 220px;
      width: 220px;
      max-width: 100%;
      filter: drop-shadow(0 18px 24px rgb(0 0 0 / 60%));
    }
    .paths > div {
      flex: 1 1 440px;
      min-width: 0;
    }
    .paths h2 {
      margin-bottom: 0.6rem;
    }
    .path-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.7rem 1.05rem;
      border-radius: 14px;
      background: #000;
      border: 1px solid rgb(41 182 255 / 40%);
      color: var(--text);
      font-weight: 700;
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }
    .path-chip:hover {
      color: var(--text);
      border-color: var(--neon);
      box-shadow: 0 0 18px var(--neon-glow);
    }
    .path-chip .mono {
      font-size: 0.8rem;
      color: var(--neon);
    }

    /* Videos y blog */
    .video,
    .post {
      color: var(--text);
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .video h3,
    .post h3 {
      margin: 0;
      font-size: 1.2rem;
    }
    .post p {
      margin: 0;
      font-size: 0.95rem;
      flex: 1;
    }
    .post .badge {
      align-self: flex-start;
    }
    .badge.neon {
      color: var(--neon);
      border-color: rgb(41 182 255 / 40%);
      background: rgb(41 182 255 / 10%);
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
      color: #fff;
      background: rgb(0 0 0 / 30%);
    }
    .play app-icon {
      padding: 14px;
      box-sizing: content-box;
      border-radius: 50%;
      background: rgb(207 53 23 / 90%);
    }
    .date {
      font-size: 0.8rem;
    }

    /* Comunidad */
    .community {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
    }
    .community > div {
      flex: 1 1 440px;
      min-width: 0;
    }
    .community > img {
      flex: 0 1 270px;
      width: 270px;
      max-width: 100%;
      margin-inline: auto;
      filter: drop-shadow(0 20px 26px rgb(0 0 0 / 60%));
    }
    .lead-sm {
      max-width: 50ch;
      font-size: 1.05rem;
    }
    .online {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.88rem;
      color: var(--ok);
    }
    .pulse {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--ok);
      box-shadow: 0 0 0 5px rgb(62 207 142 / 20%);
    }

    /* Llamado final */
    .final {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.5rem 2rem;
      padding: clamp(1.5rem, 4vw, 2.5rem) clamp(1.5rem, 4vw, 3rem);
      border-radius: 28px;
      background: #c2301a;
    }
    .final > img {
      width: 130px;
      flex: 0 0 auto;
      filter: drop-shadow(0 14px 20px rgb(60 10 0 / 45%));
    }
    .final-copy {
      flex: 1 1 320px;
      min-width: 0;
    }
    .final h2 {
      margin: 0 0 0.4rem;
      color: #fff;
    }
    .final p {
      margin: 0;
      color: #ffe4da;
      font-size: 1.05rem;
    }
    .btn.dark {
      background: #000;
      color: #fff;
    }
    .btn.dark:hover {
      background: #111;
      box-shadow: 0 0 22px rgb(41 182 255 / 35%);
    }

    @media (max-width: 860px) {
      .hero {
        grid-template-columns: 1fr;
      }
      .hero-art {
        min-height: 360px;
      }
      .mascot,
      .orb {
        width: min(320px, 80%);
      }
      .code-card {
        bottom: 0.5rem;
      }
      .cert-chip {
        top: 0.5rem;
      }
    }
  `,
})
export class Home {
  private readonly catalog = inject(CatalogApi);
  private readonly content = inject(ContentApi);
  protected readonly site = inject(Site);
  protected readonly icon = categoryIcon;
  protected readonly socialIcon = (label: string): IconName => SOCIAL_ICONS[label] ?? 'arrow-right';

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
