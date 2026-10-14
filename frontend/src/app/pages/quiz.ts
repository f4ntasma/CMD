import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LearningApi } from '../core/api';
import { QuizResult } from '../core/models';
import { Toasts } from '../core/toasts';
import { loader } from '../shared/loader';

@Component({
  selector: 'app-quiz',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container quiz">
      <a class="muted" [routerLink]="['/cursos', slug()]">← Volver al curso</a>

      @if (quiz.value(); as data) {
        <span class="eyebrow top">Cuestionario</span>
        <h1>{{ data.title }}</h1>
        <p class="muted">Necesitas {{ data.passingScore }}% para aprobar. Puedes intentarlo las veces que quieras.</p>

        @if (result(); as outcome) {
          <div class="panel outcome">
            <img [src]="outcome.passed ? '/mascot/spriteLaugh.webp' : '/mascot/spriteThink.webp'" alt="" width="120" height="120" />
            <div>
              <h2>{{ outcome.passed ? '¡Aprobado!' : 'Casi. Inténtalo otra vez' }}</h2>
              <p class="score mono">{{ outcome.score }}%</p>
              <div class="row">
                @if (!outcome.passed) {
                  <button class="btn" type="button" (click)="retry()">Reintentar</button>
                }
                @if (outcome.state.certificateCode; as code) {
                  <a class="btn blue" [routerLink]="['/certificados', code]">Ver mi certificado</a>
                }
                <a class="btn ghost" [routerLink]="['/cursos', slug()]">Volver al temario</a>
              </div>
            </div>
          </div>
        }

        <form class="stack" (submit)="$event.preventDefault(); submit()">
          @for (question of data.questions; track question.id; let index = $index) {
            <fieldset class="card" [class.right]="verdict(question.id) === true" [class.wrong]="verdict(question.id) === false">
              <legend>{{ index + 1 }}. {{ question.statement }}</legend>
              @for (option of question.options; track option.id) {
                <label class="check option" [class.correct]="result() && correctOption(question.id) === option.id">
                  <input type="radio" [name]="'q' + question.id" [value]="option.id" [disabled]="result() !== null"
                         [checked]="answers()[question.id] === option.id" (change)="choose(question.id, option.id)" />
                  {{ option.text }}
                </label>
              }
            </fieldset>
          }
          @if (!result()) {
            <div>
              <button class="btn" type="submit" [disabled]="busy() || !allAnswered()">Enviar respuestas</button>
              @if (!allAnswered()) {
                <span class="hint"> Responde todas las preguntas para enviar.</span>
              }
            </div>
          }
        </form>
      } @else if (quiz.loading()) {
        <div class="skeleton top"></div>
      } @else {
        <div class="card empty top">
          <img src="/mascot/spriteThink.webp" alt="" />
          <h2>Este cuestionario es para estudiantes inscritos</h2>
          <a class="btn" [routerLink]="['/cursos', slug()]">Ver el curso</a>
        </div>
      }
    </div>
  `,
  styles: `
    .quiz {
      max-width: 780px;
      padding: 1.5rem 0 3rem;
    }
    .top {
      margin-top: 1.2rem;
    }
    fieldset {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    legend {
      font-weight: 600;
      font-size: 1.05rem;
      padding: 0 0.4rem;
    }
    fieldset.right {
      border-color: rgb(62 207 142 / 55%);
    }
    fieldset.wrong {
      border-color: rgb(255 107 107 / 55%);
    }
    .option {
      padding: 0.55rem 0.7rem;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      cursor: pointer;
    }
    .option:hover {
      background: var(--surface-2);
    }
    .option.correct {
      border-color: rgb(62 207 142 / 55%);
      background: rgb(62 207 142 / 10%);
    }
    .outcome {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      margin: 1.5rem 0;
    }
    .outcome h2 {
      margin: 0;
    }
    .score {
      font-size: 2.2rem;
      font-weight: 700;
      margin: 0.2rem 0 0.8rem;
    }
  `,
})
export class QuizPage {
  private readonly api = inject(LearningApi);
  private readonly toasts = inject(Toasts);

  readonly slug = input.required<string>();
  readonly quizId = input.required<string>();

  protected readonly quiz = loader(this.quizId, (id) => this.api.quiz(Number(id)));
  protected readonly answers = signal<Record<number, number>>({});
  protected readonly result = signal<QuizResult | null>(null);
  protected readonly busy = signal(false);
  protected readonly allAnswered = computed(() =>
    (this.quiz.value()?.questions ?? []).every((question) => this.answers()[question.id] !== undefined),
  );

  protected choose(questionId: number, optionId: number): void {
    this.answers.update((answers) => ({ ...answers, [questionId]: optionId }));
  }

  /** true/false tras corregir; undefined mientras no hay resultado. */
  protected verdict(questionId: number): boolean | undefined {
    return this.result()?.results.find((entry) => entry.questionId === questionId)?.correct;
  }

  protected correctOption(questionId: number): number | undefined {
    return this.result()?.results.find((entry) => entry.questionId === questionId)?.correctOptionId;
  }

  protected submit(): void {
    this.busy.set(true);
    this.api.submitQuiz(Number(this.quizId()), this.answers()).subscribe({
      next: (result) => {
        this.result.set(result);
        this.busy.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.toasts.error(error);
      },
    });
  }

  protected retry(): void {
    this.result.set(null);
    this.answers.set({});
  }
}
