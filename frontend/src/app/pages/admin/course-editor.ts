import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AdminApi, CatalogApi } from '../../core/api';
import { AdminCourse, AdminLesson, AdminModule, CourseStatus, LEVEL_LABELS, Level } from '../../core/models';
import { Toasts } from '../../core/toasts';

interface CourseForm {
  title: string;
  slug: string;
  summary: string;
  description: string;
  categoryId: number;
  level: Level;
  coverUrl: string;
  price: number;
  status: CourseStatus;
  featured: boolean;
}

interface LessonDraft {
  moduleId: number;
  id: number | null;
  title: string;
  youtubeVideo: string;
  minutes: number;
  freePreview: boolean;
  position: number;
  content: string;
}

interface QuizDraft {
  moduleId: number;
  title: string;
  passingScore: number;
  /** correctIndex: posición de la opción correcta dentro de options. */
  questions: { statement: string; options: { text: string }[]; correctIndex: number }[];
}

/** Editor de un curso: sus datos, y el temario completo (módulos, clases y cuestionarios). */
@Component({
  selector: 'app-course-editor',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="muted" routerLink="/admin/cursos">← Cursos</a>
    @if (course(); as data) {
      <div class="spread head">
        <h1>{{ data.title }}</h1>
        @if (data.status === 'PUBLISHED') {
          <a class="btn ghost small" [routerLink]="['/cursos', data.slug]">Ver en el sitio</a>
        }
      </div>

      @if (form(); as model) {
        <form class="card stack" (ngSubmit)="saveCourse()">
          <h2>Datos del curso</h2>
          <div class="form-row">
            <label>Título <input type="text" name="title" [(ngModel)]="model.title" required maxlength="150" /></label>
            <label>Dirección (slug)
              <input type="text" name="slug" [(ngModel)]="model.slug" maxlength="120" />
              <span class="hint">/cursos/{{ model.slug }}</span>
            </label>
          </div>
          <label>Resumen <input type="text" name="summary" [(ngModel)]="model.summary" required maxlength="300" /></label>
          <label>Descripción
            <textarea name="description" [(ngModel)]="model.description" rows="8"></textarea>
            <span class="hint">Admite Markdown: ## títulos, **negrita**, listas y bloques de código.</span>
          </label>
          <div class="form-row">
            <label>Categoría
              <select name="categoryId" [(ngModel)]="model.categoryId">
                @for (category of categories(); track category.id) {
                  <option [ngValue]="category.id">{{ category.name }}</option>
                }
              </select>
            </label>
            <label>Nivel
              <select name="level" [(ngModel)]="model.level">
                @for (level of levels; track level) {
                  <option [value]="level">{{ levelLabels[level] }}</option>
                }
              </select>
            </label>
            <label>Precio (S/)
              <input type="number" name="price" [(ngModel)]="model.price" min="0" step="0.01" required />
              <span class="hint">0 = curso gratuito.</span>
            </label>
            <label>Estado
              <select name="status" [(ngModel)]="model.status">
                <option value="DRAFT">Borrador</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="ARCHIVED">Archivado</option>
              </select>
            </label>
          </div>
          <label>Portada (enlace a una imagen)
            <input type="url" name="coverUrl" [(ngModel)]="model.coverUrl" placeholder="https://…" maxlength="500" />
          </label>
          <label class="check"><input type="checkbox" name="featured" [(ngModel)]="model.featured" /> Destacar en la portada</label>
          <div class="spread">
            <button class="btn" type="submit" [disabled]="busy()">Guardar curso</button>
            <button class="btn danger small" type="button" (click)="deleteCourse()">Eliminar curso</button>
          </div>
        </form>
      }

      <h2 class="section-title">Temario</h2>
      <div class="stack">
        @for (module of data.modules; track module.id) {
          <div class="card stack">
            <div class="row">
              <input class="grow" type="text" [value]="module.title" #moduleTitle maxlength="150" aria-label="Título del módulo" />
              <input class="pos" type="number" [value]="module.position" #modulePosition aria-label="Orden del módulo" />
              <button class="btn ghost small" type="button" (click)="saveModule(module.id, moduleTitle.value, +modulePosition.value)">Guardar</button>
              <button class="btn danger small" type="button" (click)="deleteModule(module)">Eliminar</button>
            </div>

            <ul class="lessons">
              @for (lesson of module.lessons; track lesson.id) {
                <li>
                  <span class="mono muted">{{ lesson.position }}</span>
                  <span class="grow">{{ lesson.title }}</span>
                  @if (lesson.youtubeVideoId) { <span class="badge">Video</span> }
                  @if (lesson.freePreview) { <span class="badge ok">Vista previa</span> }
                  <button class="link-btn" type="button" (click)="editLesson(module, lesson)">Editar</button>
                  <button class="link-btn" type="button" (click)="deleteLesson(lesson)">Borrar</button>
                </li>
              } @empty {
                <li class="muted">Este módulo aún no tiene clases.</li>
              }
            </ul>

            @if (lessonDraft(); as draft) {
              @if (draft.moduleId === module.id) {
                <form class="stack sub" (ngSubmit)="saveLesson()">
                  <strong>{{ draft.id ? 'Editar clase' : 'Clase nueva' }}</strong>
                  <div class="form-row">
                    <label>Título <input type="text" name="lessonTitle" [(ngModel)]="draft.title" required maxlength="150" /></label>
                    <label>Video de YouTube
                      <input type="text" name="lessonVideo" [(ngModel)]="draft.youtubeVideo" placeholder="Pega el enlace del video" />
                      <span class="hint">Súbelo como «No listado».</span>
                    </label>
                  </div>
                  <div class="form-row">
                    <label>Duración (minutos) <input type="number" name="lessonMinutes" [(ngModel)]="draft.minutes" min="0" /></label>
                    <label>Orden <input type="number" name="lessonPosition" [(ngModel)]="draft.position" /></label>
                    <label class="check"><input type="checkbox" name="lessonPreview" [(ngModel)]="draft.freePreview" /> Vista previa gratuita</label>
                  </div>
                  <label>Apuntes (Markdown, opcional si hay video)
                    <textarea name="lessonContent" [(ngModel)]="draft.content" rows="6"></textarea>
                  </label>
                  <div class="row">
                    <button class="btn small" type="submit" [disabled]="busy()">Guardar clase</button>
                    <button class="btn ghost small" type="button" (click)="lessonDraft.set(null)">Cancelar</button>
                  </div>
                </form>
              }
            }

            @if (quizDraft(); as quiz) {
              @if (quiz.moduleId === module.id) {
                <form class="stack sub" (ngSubmit)="saveQuiz()">
                  <strong>Cuestionario del módulo</strong>
                  <div class="form-row">
                    <label>Título <input type="text" name="quizTitle" [(ngModel)]="quiz.title" required maxlength="150" /></label>
                    <label>Nota mínima (%) <input type="number" name="quizPassing" [(ngModel)]="quiz.passingScore" min="1" max="100" /></label>
                  </div>
                  @for (question of quiz.questions; track $index; let q = $index) {
                    <div class="question stack">
                      <div class="row">
                        <input class="grow" type="text" [name]="'statement' + q" [(ngModel)]="question.statement"
                               [placeholder]="'Pregunta ' + (q + 1)" maxlength="500" />
                        <button class="link-btn" type="button" (click)="quiz.questions.splice(q, 1)">Quitar</button>
                      </div>
                      @for (option of question.options; track $index; let o = $index) {
                        <div class="row">
                          <input type="radio" [name]="'correct' + q" [checked]="question.correctIndex === o"
                                 (change)="question.correctIndex = o" [attr.aria-label]="'Marcar opción ' + (o + 1) + ' como correcta'" />
                          <input class="grow" type="text" [name]="'option' + q + '_' + o" [(ngModel)]="option.text"
                                 [placeholder]="'Opción ' + (o + 1)" maxlength="300" />
                          @if (question.options.length > 2) {
                            <button class="link-btn" type="button" (click)="removeOption(question, o)">×</button>
                          }
                        </div>
                      }
                      @if (question.options.length < 6) {
                        <div><button class="link-btn" type="button" (click)="question.options.push({ text: '' })">+ Añadir opción</button></div>
                      }
                    </div>
                  }
                  <span class="hint">Marca con el círculo la opción correcta de cada pregunta.</span>
                  <div class="row">
                    <button class="btn ghost small" type="button" (click)="addQuestion(quiz)">+ Añadir pregunta</button>
                    <button class="btn small" type="submit" [disabled]="busy() || quiz.questions.length === 0">Guardar cuestionario</button>
                    <button class="btn ghost small" type="button" (click)="quizDraft.set(null)">Cancelar</button>
                    @if (module.quiz) {
                      <button class="btn danger small" type="button" (click)="deleteQuiz(module)">Eliminar cuestionario</button>
                    }
                  </div>
                </form>
              }
            }

            <div class="row">
              <button class="btn ghost small" type="button" (click)="newLesson(module)">+ Clase</button>
              <button class="btn ghost small" type="button" (click)="editQuiz(module)">
                {{ module.quiz ? 'Editar cuestionario (' + module.quiz.questions.length + ' preguntas)' : '+ Cuestionario' }}
              </button>
            </div>
          </div>
        } @empty {
          <p class="muted">Empieza añadiendo el primer módulo.</p>
        }

        <form class="card row" (ngSubmit)="addModule()">
          <input class="grow" type="text" name="newModule" [(ngModel)]="newModuleTitle" placeholder="Título del módulo nuevo"
                 maxlength="150" aria-label="Título del módulo nuevo" />
          <button class="btn" type="submit" [disabled]="!newModuleTitle.trim()">Añadir módulo</button>
        </form>
      </div>
    } @else {
      <div class="skeleton"></div>
    }
  `,
  styles: `
    .head {
      margin: 0.8rem 0 1.2rem;
    }
    .head h1 {
      margin: 0;
      font-size: 1.8rem;
    }
    h2 {
      font-size: 1.25rem;
      margin: 0;
    }
    .section-title {
      margin: 2rem 0 1rem;
    }
    .grow {
      flex: 1;
      min-width: 160px;
    }
    .pos {
      width: 80px;
    }
    .lessons {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .lessons li {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.5rem 0;
      border-top: 1px solid var(--line);
      flex-wrap: wrap;
    }
    .sub {
      padding: 1rem;
      border-radius: var(--radius-sm);
      background: #10131b;
      border: 1px dashed var(--line);
    }
    .question {
      padding: 0.8rem;
      border-radius: var(--radius-sm);
      background: var(--surface);
      gap: 0.5rem;
    }
  `,
})
export class CourseEditor {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);

  readonly id = input.required<string>();

  protected readonly levels: Level[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
  protected readonly levelLabels = LEVEL_LABELS;
  protected readonly categories = toSignal(inject(CatalogApi).categories(), { initialValue: [] });
  protected readonly course = signal<AdminCourse | null>(null);
  protected readonly form = signal<CourseForm | null>(null);
  protected readonly lessonDraft = signal<LessonDraft | null>(null);
  protected readonly quizDraft = signal<QuizDraft | null>(null);
  protected readonly busy = signal(false);
  protected newModuleTitle = '';

  constructor() {
    effect(() => this.load(Number(this.id())));
  }

  private load(id: number): void {
    this.api.course(id).subscribe({ next: (course) => this.show(course), error: (e: unknown) => this.toasts.error(e) });
  }

  private show(course: AdminCourse): void {
    this.course.set(course);
    this.form.set({
      title: course.title,
      slug: course.slug,
      summary: course.summary,
      description: course.description,
      categoryId: course.categoryId,
      level: course.level,
      coverUrl: course.coverUrl ?? '',
      price: course.price,
      status: course.status,
      featured: course.featured,
    });
  }

  /** Ejecuta un cambio y, si sale bien, recarga el curso para reflejarlo. */
  private run(action: Observable<unknown>, success: string, after?: () => void): void {
    this.busy.set(true);
    action.subscribe({
      next: () => {
        this.busy.set(false);
        this.toasts.ok(success);
        after?.();
        this.load(Number(this.id()));
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.toasts.error(error);
      },
    });
  }

  protected saveCourse(): void {
    this.run(this.api.saveCourse(Number(this.id()), this.form()), 'Curso guardado');
  }

  protected deleteCourse(): void {
    if (!confirm('¿Eliminar este curso con todo su temario? No se puede deshacer.')) {
      return;
    }
    this.api.deleteCourse(Number(this.id())).subscribe({
      next: () => void this.router.navigate(['/admin/cursos']),
      error: () => this.toasts.error('No se puede eliminar un curso con inscripciones o compras. Archívalo en su lugar.'),
    });
  }

  protected addModule(): void {
    const position = (this.course()?.modules.length ?? 0) + 1;
    this.run(this.api.saveModule(Number(this.id()), null, { title: this.newModuleTitle, position }), 'Módulo añadido',
      () => (this.newModuleTitle = ''));
  }

  protected saveModule(moduleId: number, title: string, position: number): void {
    this.run(this.api.saveModule(Number(this.id()), moduleId, { title, position }), 'Módulo guardado');
  }

  protected deleteModule(module: AdminModule): void {
    if (confirm(`¿Eliminar el módulo «${module.title}» y sus clases?`)) {
      this.run(this.api.deleteModule(module.id), 'Módulo eliminado');
    }
  }

  protected newLesson(module: AdminModule): void {
    this.quizDraft.set(null);
    this.lessonDraft.set({
      moduleId: module.id, id: null, title: '', youtubeVideo: '', minutes: 0, freePreview: false,
      position: module.lessons.length + 1, content: '',
    });
  }

  protected editLesson(module: AdminModule, lesson: AdminLesson): void {
    this.quizDraft.set(null);
    this.lessonDraft.set({
      moduleId: module.id, id: lesson.id, title: lesson.title, youtubeVideo: lesson.youtubeVideoId ?? '',
      minutes: Math.round(lesson.durationSeconds / 60), freePreview: lesson.freePreview,
      position: lesson.position, content: lesson.content,
    });
  }

  protected saveLesson(): void {
    const draft = this.lessonDraft();
    if (!draft) {
      return;
    }
    const body = {
      title: draft.title, youtubeVideo: draft.youtubeVideo, content: draft.content,
      durationSeconds: Math.max(0, Math.round(draft.minutes * 60)), freePreview: draft.freePreview,
      position: draft.position,
    };
    this.run(this.api.saveLesson(draft.moduleId, draft.id, body), 'Clase guardada', () => this.lessonDraft.set(null));
  }

  protected deleteLesson(lesson: AdminLesson): void {
    if (confirm(`¿Borrar la clase «${lesson.title}»?`)) {
      this.run(this.api.deleteLesson(lesson.id), 'Clase borrada');
    }
  }

  protected editQuiz(module: AdminModule): void {
    this.lessonDraft.set(null);
    this.quizDraft.set({
      moduleId: module.id,
      title: module.quiz?.title ?? `Cuestionario: ${module.title}`,
      passingScore: module.quiz?.passingScore ?? 70,
      questions: (module.quiz?.questions ?? []).map((question) => ({
        statement: question.statement,
        options: question.options.map((option) => ({ text: option.text })),
        correctIndex: Math.max(question.options.findIndex((option) => option.correct), 0),
      })),
    });
    if (!module.quiz) {
      this.addQuestion(this.quizDraft()!);
    }
  }

  protected addQuestion(quiz: QuizDraft): void {
    quiz.questions.push({ statement: '', options: [{ text: '' }, { text: '' }], correctIndex: 0 });
  }

  protected removeOption(question: QuizDraft['questions'][number], index: number): void {
    question.options.splice(index, 1);
    if (question.correctIndex >= question.options.length) {
      question.correctIndex = 0;
    }
  }

  protected saveQuiz(): void {
    const quiz = this.quizDraft();
    if (!quiz) {
      return;
    }
    const body = {
      title: quiz.title,
      passingScore: quiz.passingScore,
      questions: quiz.questions.map((question) => ({
        statement: question.statement,
        options: question.options.map((option, index) => ({ text: option.text, correct: index === question.correctIndex })),
      })),
    };
    this.run(this.api.saveQuiz(quiz.moduleId, body), 'Cuestionario guardado', () => this.quizDraft.set(null));
  }

  protected deleteQuiz(module: AdminModule): void {
    if (confirm('¿Eliminar el cuestionario de este módulo?')) {
      this.run(this.api.deleteQuiz(module.id), 'Cuestionario eliminado', () => this.quizDraft.set(null));
    }
  }
}
