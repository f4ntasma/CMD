import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { CatalogApi, LearningApi } from '../core/api';
import { Auth } from '../core/auth';
import { Comment, ViewerState } from '../core/models';
import { Toasts } from '../core/toasts';
import { DurationPipe, ShortDatePipe } from '../shared/format';
import { loader } from '../shared/loader';

/** Reproductor de una clase: video, apuntes, temario lateral, progreso y comentarios. */
@Component({
  selector: 'app-player',
  imports: [RouterLink, FormsModule, NgTemplateOutlet, DurationPipe, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container layout">
      <section class="main">
        <a class="muted" [routerLink]="['/cursos', slug()]">← {{ course.value()?.course?.title ?? 'Volver al curso' }}</a>

        @if (lesson.value(); as data) {
          <span class="eyebrow top">{{ data.moduleTitle }}</span>
          <h1>{{ data.title }}</h1>

          @if (videoUrl(); as url) {
            <div class="video">
              <iframe [src]="url" [title]="data.title" allowfullscreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      referrerpolicy="strict-origin-when-cross-origin"></iframe>
            </div>
          }
          @if (data.contentHtml) {
            <article class="prose card" [innerHTML]="data.contentHtml"></article>
          }

          <div class="spread actions">
            @if (data.previousLessonId; as previous) {
              <a class="btn ghost" [routerLink]="['/cursos', slug(), 'clase', previous]">← Anterior</a>
            } @else {
              <span></span>
            }
            @if (state()?.enrolled) {
              <button class="btn" type="button" [class.ghost]="isDone()" [disabled]="busy()" (click)="toggleDone()">
                {{ isDone() ? '✓ Completada' : 'Marcar como completada' }}
              </button>
            }
            @if (data.nextLessonId; as next) {
              <a class="btn blue" [routerLink]="['/cursos', slug(), 'clase', next]">Siguiente →</a>
            } @else {
              <a class="btn blue" [routerLink]="['/cursos', slug()]">Volver al temario</a>
            }
          </div>

          @if (state()?.certificateCode; as code) {
            <p class="alert ok">
              ¡Completaste el curso! <a [routerLink]="['/certificados', code]">Ver tu certificado</a>
            </p>
          }

          <section class="comments">
            <h2>Preguntas y comentarios</h2>
            @if (state()?.enrolled || auth.isAdmin()) {
              <form class="stack" (ngSubmit)="addComment(null)">
                <textarea name="body" [(ngModel)]="draft" maxlength="2000" placeholder="¿Tienes una duda sobre esta clase?"
                          aria-label="Escribe un comentario"></textarea>
                <div><button class="btn small" type="submit" [disabled]="busy() || !draft.trim()">Publicar</button></div>
              </form>
            } @else {
              <p class="muted">Inscríbete en el curso para participar.</p>
            }
            <div class="stack thread">
              @for (comment of comments(); track comment.id) {
                <div class="card comment">
                  <ng-container *ngTemplateOutlet="body; context: { $implicit: comment }" />
                  @for (reply of comment.replies; track reply.id) {
                    <div class="reply"><ng-container *ngTemplateOutlet="body; context: { $implicit: reply }" /></div>
                  }
                  @if (state()?.enrolled || auth.isAdmin()) {
                    @if (replyingTo() === comment.id) {
                      <form class="stack reply" (ngSubmit)="addComment(comment.id)">
                        <textarea name="reply" [(ngModel)]="replyDraft" maxlength="2000" aria-label="Escribe una respuesta"></textarea>
                        <div class="row">
                          <button class="btn small" type="submit" [disabled]="busy() || !replyDraft.trim()">Responder</button>
                          <button class="btn ghost small" type="button" (click)="replyingTo.set(null)">Cancelar</button>
                        </div>
                      </form>
                    } @else {
                      <button class="link-btn" type="button" (click)="replyingTo.set(comment.id); replyDraft = ''">Responder</button>
                    }
                  }
                </div>
              } @empty {
                <p class="muted">Sé el primero en preguntar.</p>
              }
            </div>
          </section>
        } @else if (lesson.error(); as failure) {
          <div class="card empty top">
            <img src="/mascot/spriteThink.png" alt="" />
            @switch (status(failure)) {
              @case (401) {
                <h2>Inicia sesión para ver esta clase</h2>
                <a class="btn" routerLink="/ingresar" [queryParams]="{ volver: '/cursos/' + slug() + '/clase/' + lessonId() }">Ingresar</a>
              }
              @case (403) {
                <h2>Esta clase es parte del curso</h2>
                <p>Inscríbete para desbloquear todas las clases.</p>
                <a class="btn" [routerLink]="['/cursos', slug()]">Ver el curso</a>
              }
              @default {
                <h2>No encontramos esta clase</h2>
                <a class="btn" [routerLink]="['/cursos', slug()]">Volver al curso</a>
              }
            }
          </div>
        } @else {
          <div class="skeleton top"></div>
        }
      </section>

      <aside class="card side">
        @if (state()?.enrolled) {
          <div class="spread muted mono small"><span>Tu progreso</span><span>{{ state()?.progressPercent }}%</span></div>
          <div class="progress"><span [style.width.%]="state()?.progressPercent"></span></div>
        }
        @for (module of course.value()?.modules ?? []; track module.id) {
          <h3>{{ module.title }}</h3>
          <ul>
            @for (item of module.lessons; track item.id) {
              <li [class.current]="item.id === currentId()">
                <span class="tick" [class.done]="doneIds().has(item.id)">{{ doneIds().has(item.id) ? '✓' : '' }}</span>
                <a [routerLink]="['/cursos', slug(), 'clase', item.id]">{{ item.title }}</a>
                <span class="muted mono small">{{ item.durationSeconds | duration }}</span>
              </li>
            }
            @if (module.quiz; as quiz) {
              <li>
                <span class="tick" [class.done]="quizPassed(quiz.id)">{{ quizPassed(quiz.id) ? '✓' : '?' }}</span>
                <a [routerLink]="['/cursos', slug(), 'cuestionario', quiz.id]">{{ quiz.title }}</a>
              </li>
            }
          </ul>
        }
      </aside>
    </div>

    <ng-template #body let-comment>
      <div class="row who">
        <strong>{{ comment.authorName }}</strong>
        @if (comment.authorIsAdmin) {
          <span class="badge brand">Instructor</span>
        }
        <span class="muted mono small">{{ comment.createdAt | shortDate }}</span>
        @if (comment.mine || auth.isAdmin()) {
          <button class="link-btn small" type="button" (click)="removeComment(comment)">Borrar</button>
        }
      </div>
      <p class="text">{{ comment.body }}</p>
    </ng-template>
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 330px;
      gap: 2rem;
      padding: 1.5rem 0 3rem;
      align-items: start;
    }
    .top {
      margin-top: 1.2rem;
    }
    h1 {
      font-size: clamp(1.6rem, 3vw, 2.2rem);
    }
    .video {
      aspect-ratio: 16 / 9;
      border-radius: var(--radius);
      overflow: hidden;
      background: #000;
      border: 1px solid var(--line);
      margin-bottom: 1.25rem;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: 0;
    }
    .actions {
      margin: 1.5rem 0;
    }
    .comments {
      margin-top: 2.5rem;
    }
    .thread {
      margin-top: 1.5rem;
    }
    .comment {
      padding: 1rem 1.2rem;
    }
    .reply {
      margin: 0.8rem 0 0 1.2rem;
      padding-left: 1rem;
      border-left: 2px solid var(--line);
    }
    .text {
      margin: 0.3rem 0 0.5rem;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .small {
      font-size: 0.78rem;
    }
    .side {
      position: sticky;
      top: 92px;
      max-height: calc(100vh - 110px);
      overflow-y: auto;
    }
    .side h3 {
      font-size: 0.95rem;
      margin: 1.2rem 0 0.4rem;
    }
    .side ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .side li {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.45rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.92rem;
    }
    .side li a {
      color: var(--text);
      flex: 1;
    }
    .side li.current {
      background: var(--surface-2);
      box-shadow: inset 3px 0 0 var(--brand);
    }
    .tick {
      width: 1.2rem;
      height: 1.2rem;
      border-radius: 50%;
      border: 1px solid var(--line);
      display: grid;
      place-items: center;
      font-size: 0.65rem;
      color: var(--muted);
      flex-shrink: 0;
    }
    .tick.done {
      background: rgb(62 207 142 / 20%);
      border-color: transparent;
      color: var(--ok);
    }
    @media (max-width: 960px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .side {
        position: static;
        max-height: none;
      }
    }
  `,
})
export class Player {
  private readonly catalog = inject(CatalogApi);
  private readonly learning = inject(LearningApi);
  protected readonly auth = inject(Auth);
  private readonly toasts = inject(Toasts);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly title = inject(Title);

  readonly slug = input.required<string>();
  readonly lessonId = input.required<string>();

  protected draft = '';
  protected replyDraft = '';
  protected readonly busy = signal(false);
  protected readonly replyingTo = signal<number | null>(null);
  protected readonly state = signal<ViewerState | null>(null);
  protected readonly comments = signal<Comment[]>([]);
  private readonly sessionReady = signal(false);

  protected readonly currentId = computed(() => Number(this.lessonId()));
  protected readonly course = loader(this.slug, (slug) => this.catalog.course(slug));
  /** Espera a conocer la sesión: una clase puede verse o no según quién la pida. */
  protected readonly lesson = loader(
    computed(() => (this.sessionReady() ? { slug: this.slug(), id: this.currentId() } : null)),
    (target) => (target ? this.learning.lesson(target.slug, target.id) : of(null)),
  );

  protected readonly doneIds = computed(() => new Set(this.state()?.completedLessonIds ?? []));
  protected readonly isDone = computed(() => this.doneIds().has(this.currentId()));

  /** El id se valida antes de construir la URL del iframe: nunca se confía en texto arbitrario. */
  protected readonly videoUrl = computed<SafeResourceUrl | null>(() => {
    const id = this.lesson.value()?.youtubeVideoId;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id)
      ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${id}?rel=0`)
      : null;
  });

  constructor() {
    void this.auth.ready().then(() => this.sessionReady.set(true));

    effect(() => {
      const data = this.lesson.value();
      if (!data) {
        return;
      }
      this.title.setTitle(`${data.title} · Monkey Coffe Dev's`);
      this.replyingTo.set(null);
      this.learning.comments(this.slug(), data.id).subscribe({
        next: (comments) => this.comments.set(comments),
        error: () => this.comments.set([]),
      });
    });
    effect(() => {
      const slug = this.slug();
      if (this.sessionReady() && this.auth.user()) {
        this.learning.state(slug).subscribe({ next: (state) => this.state.set(state), error: () => undefined });
      } else {
        this.state.set(null);
      }
    });
  }

  protected status(failure: unknown): number {
    return failure instanceof HttpErrorResponse ? failure.status : 0;
  }

  protected quizPassed(quizId: number): boolean {
    return (this.state()?.quizzes ?? []).some((quiz) => quiz.quizId === quizId && quiz.passed);
  }

  protected toggleDone(): void {
    this.busy.set(true);
    this.learning.setCompleted(this.currentId(), !this.isDone()).subscribe({
      next: (state) => {
        const justFinished = state.completed && !this.state()?.completed;
        this.state.set(state);
        this.busy.set(false);
        if (justFinished) {
          this.toasts.ok('¡Felicidades! Completaste el curso y tu certificado está listo.');
        }
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.toasts.error(error);
      },
    });
  }

  protected addComment(parentId: number | null): void {
    const text = (parentId === null ? this.draft : this.replyDraft).trim();
    if (!text) {
      return;
    }
    this.busy.set(true);
    this.learning.addComment(this.currentId(), text, parentId).subscribe({
      next: (created) => {
        this.comments.update((comments) =>
          parentId === null
            ? [...comments, created]
            : comments.map((comment) =>
                comment.id === parentId ? { ...comment, replies: [...comment.replies, created] } : comment,
              ),
        );
        this.draft = parentId === null ? '' : this.draft;
        this.replyDraft = '';
        this.replyingTo.set(null);
        this.busy.set(false);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.toasts.error(error);
      },
    });
  }

  protected removeComment(target: Comment): void {
    if (!confirm('¿Borrar este comentario?')) {
      return;
    }
    this.learning.deleteComment(target.id).subscribe({
      next: () =>
        this.comments.update((comments) =>
          comments
            .filter((comment) => comment.id !== target.id)
            .map((comment) => ({ ...comment, replies: comment.replies.filter((reply) => reply.id !== target.id) })),
        ),
      error: (error: unknown) => this.toasts.error(error),
    });
  }
}
