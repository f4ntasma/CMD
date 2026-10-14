import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { CatalogApi, LearningApi } from '../core/api';
import { Auth } from '../core/auth';
import { CourseDetail, LEVEL_LABELS, ViewerState } from '../core/models';
import { SITE_NAME, SITE_URL, Seo } from '../core/seo';
import { Toasts } from '../core/toasts';
import { DurationPipe, PricePipe } from '../shared/format';
import { loader } from '../shared/loader';

@Component({
  selector: 'app-course-detail',
  imports: [RouterLink, DurationPipe, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (detail.loading() && !detail.value()) {
      <div class="container section"><div class="skeleton"></div></div>
    } @else if (detail.value(); as data) {
      <div class="container layout">
        <article>
          <a class="muted" routerLink="/cursos">← Todos los cursos</a>
          <span class="eyebrow category" [style.color]="data.course.category.color">{{ data.course.category.name }}</span>
          <h1>{{ data.course.title }}</h1>
          <p class="lead muted">{{ data.course.summary }}</p>
          <div class="row meta mono">
            <span class="badge">{{ levels[data.course.level] }}</span>
            <span class="badge">{{ data.course.lessonCount }} {{ data.course.lessonCount === 1 ? 'clase' : 'clases' }}</span>
            <span class="badge">{{ data.course.durationSeconds | duration }}</span>
          </div>

          @if (data.descriptionHtml) {
            <section class="prose" [innerHTML]="data.descriptionHtml"></section>
          }

          <section>
            <h2>Temario</h2>
            <div class="stack">
              @for (module of data.modules; track module.id; let index = $index) {
                <div class="card module">
                  <h3><span class="mono muted">{{ (index + 1).toString().padStart(2, '0') }}</span> {{ module.title }}</h3>
                  <ul>
                    @for (lesson of module.lessons; track lesson.id) {
                      <li>
                        <span class="state" [class.done]="isDone(lesson.id)">{{ isDone(lesson.id) ? '✓' : lesson.hasVideo ? '▶' : '≡' }}</span>
                        @if (canOpen(lesson.freePreview)) {
                          <a [routerLink]="['/cursos', data.course.slug, 'clase', lesson.id]">{{ lesson.title }}</a>
                        } @else {
                          <span>{{ lesson.title }}</span>
                        }
                        @if (lesson.freePreview && !state().enrolled) {
                          <span class="badge ok">Vista previa</span>
                        }
                        <span class="muted mono time">{{ lesson.durationSeconds | duration }}</span>
                      </li>
                    }
                    @if (module.quiz; as quiz) {
                      <li>
                        <span class="state" [class.done]="quizPassed(quiz.id)">{{ quizPassed(quiz.id) ? '✓' : '?' }}</span>
                        @if (state().enrolled) {
                          <a [routerLink]="['/cursos', data.course.slug, 'cuestionario', quiz.id]">{{ quiz.title }}</a>
                        } @else {
                          <span>{{ quiz.title }}</span>
                        }
                        <span class="badge gold">Cuestionario · {{ quiz.questionCount }} preguntas</span>
                      </li>
                    }
                  </ul>
                </div>
              } @empty {
                <p class="muted">El temario se publicará pronto.</p>
              }
            </div>
          </section>
        </article>

        <aside class="card buy">
          @if (data.course.coverUrl; as cover) {
            <img class="cover" [src]="cover" alt="" />
          }
          @if (state().enrolled) {
            <div class="spread"><strong>Tu progreso</strong><span class="mono">{{ state().progressPercent }}%</span></div>
            <div class="progress"><span [style.width.%]="state().progressPercent"></span></div>
            @if (nextLessonId(); as lessonId) {
              <a class="btn block" [routerLink]="['/cursos', data.course.slug, 'clase', lessonId]">
                {{ state().progressPercent > 0 ? 'Continuar' : 'Empezar el curso' }}
              </a>
            }
            @if (state().certificateCode; as code) {
              <a class="btn blue block" [routerLink]="['/certificados', code]">Ver mi certificado</a>
            }
          } @else {
            <p class="price">{{ data.course.price | price: data.course.currency }}</p>
            @if (data.course.free) {
              <button class="btn block" type="button" [disabled]="busy()" (click)="enroll(data)">Inscribirme gratis</button>
            } @else {
              <a class="btn block" [routerLink]="['/cursos', data.course.slug, 'comprar']">Comprar curso</a>
            }
            <ul class="includes muted">
              <li>Acceso para siempre</li>
              <li>Cuestionarios por módulo</li>
              <li>Certificado verificable al terminar</li>
            </ul>
          }
        </aside>
      </div>
    } @else {
      <div class="container empty">
        <img src="/mascot/spriteThink.webp" alt="" />
        <h2>No encontramos ese curso</h2>
        <a class="btn" routerLink="/cursos">Ver el catálogo</a>
      </div>
    }
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: 2.5rem;
      padding: 2rem 0;
      align-items: start;
    }
    .category {
      margin-top: 1.2rem;
    }
    .lead {
      font-size: 1.12rem;
    }
    .meta {
      margin-bottom: 2rem;
    }
    section {
      margin-bottom: 2.5rem;
    }
    .module h3 {
      margin-bottom: 0.8rem;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .module li {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.55rem 0;
      border-top: 1px solid var(--line);
      flex-wrap: wrap;
    }
    .state {
      width: 1.6rem;
      height: 1.6rem;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--surface-2);
      color: var(--muted);
      font-size: 0.75rem;
      flex-shrink: 0;
    }
    .state.done {
      background: rgb(62 207 142 / 18%);
      color: var(--ok);
    }
    .time {
      margin-left: auto;
      font-size: 0.78rem;
    }
    .buy {
      position: sticky;
      top: 92px;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }
    .cover {
      border-radius: var(--radius-sm);
      aspect-ratio: 16 / 9;
      object-fit: cover;
    }
    .price {
      font-size: 2rem;
      font-weight: 700;
      margin: 0;
    }
    .includes {
      font-size: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .includes li::before {
      content: '✓ ';
      color: var(--ok);
    }
    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .buy {
        position: static;
        order: -1;
      }
    }
  `,
})
export class CourseDetailPage {
  private readonly catalog = inject(CatalogApi);
  private readonly learning = inject(LearningApi);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);
  private readonly title = inject(Title);
  private readonly seo = inject(Seo);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly slug = input.required<string>();

  protected readonly levels = LEVEL_LABELS;
  protected readonly busy = signal(false);
  protected readonly detail = loader(this.slug, (slug) => this.catalog.course(slug));
  protected readonly state = signal<ViewerState>(EMPTY_STATE);

  /** Primera clase sin completar; si están todas, la primera del curso. */
  protected readonly nextLessonId = computed(() => {
    const lessons = (this.detail.value()?.modules ?? []).flatMap((module) => module.lessons);
    const done = new Set(this.state().completedLessonIds);
    return (lessons.find((lesson) => !done.has(lesson.id)) ?? lessons[0])?.id ?? null;
  });

  constructor() {
    effect(() => {
      const data = this.detail.value();
      if (data) {
        const course = data.course;
        const title = `Curso de ${course.title} · Monkey Coffe Dev's`;
        this.title.setTitle(title);
        this.seo.update({
          title,
          description: course.summary,
          image: course.coverUrl,
          jsonLd: {
            '@type': 'Course',
            name: course.title,
            description: course.summary,
            url: `${SITE_URL}/cursos/${course.slug}`,
            image: course.coverUrl ?? undefined,
            inLanguage: 'es',
            educationalLevel: LEVEL_LABELS[course.level],
            about: course.category.name,
            provider: { '@type': 'EducationalOrganization', name: SITE_NAME, sameAs: SITE_URL },
            offers: {
              '@type': 'Offer',
              category: course.free ? 'Free' : 'Paid',
              price: course.free ? 0 : course.price,
              priceCurrency: course.currency,
              url: `${SITE_URL}/cursos/${course.slug}`,
            },
            hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', inLanguage: 'es' },
          },
        });
      }
    });
    // El progreso depende de la sesión: se pide solo en el navegador y cuando se sabe quién es el usuario.
    effect(() => {
      const slug = this.slug();
      const user = this.auth.user();
      this.state.set(EMPTY_STATE);
      if (this.isBrowser && user) {
        this.learning.state(slug).subscribe({ next: (state) => this.state.set(state), error: () => undefined });
      }
    });
  }

  protected isDone(lessonId: number): boolean {
    return this.state().completedLessonIds.includes(lessonId);
  }

  protected quizPassed(quizId: number): boolean {
    return this.state().quizzes.some((quiz) => quiz.quizId === quizId && quiz.passed);
  }

  protected canOpen(freePreview: boolean): boolean {
    return freePreview || this.state().enrolled || this.auth.isAdmin();
  }

  protected enroll(data: CourseDetail): void {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/ingresar'], { queryParams: { volver: `/cursos/${data.course.slug}` } });
      return;
    }
    this.busy.set(true);
    this.learning.enroll(data.course.slug).subscribe({
      next: (state) => {
        this.state.set(state);
        this.busy.set(false);
        this.toasts.ok('¡Listo! Ya estás inscrito en el curso.');
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.toasts.error(error);
      },
    });
  }
}

const EMPTY_STATE: ViewerState = {
  enrolled: false,
  completedLessonIds: [],
  quizzes: [],
  progressPercent: 0,
  completed: false,
  certificateCode: null,
};
