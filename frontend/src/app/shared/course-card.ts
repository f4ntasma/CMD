import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CourseCard, LEVEL_LABELS } from '../core/models';
import { DurationPipe, PricePipe } from './format';

@Component({
  selector: 'app-course-card',
  imports: [RouterLink, DurationPipe, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="card hover course" [routerLink]="['/cursos', course().slug]">
      <div class="cover" [style.--accent]="course().category.color">
        @if (course().coverUrl; as cover) {
          <img [src]="cover" [alt]="''" loading="lazy" />
        } @else {
          <span class="initials mono">{{ course().category.name }}</span>
        }
        <span class="badge price" [class.ok]="course().free" [class.gold]="!course().free">
          {{ course().price | price: course().currency }}
        </span>
      </div>
      <div class="body">
        <span class="category mono" [style.color]="course().category.color">{{ course().category.name }}</span>
        <h3>{{ course().title }}</h3>
        <p class="muted">{{ course().summary }}</p>
        <div class="meta mono">
          <span>{{ levels[course().level] }}</span>
          <span>{{ course().lessonCount }} {{ course().lessonCount === 1 ? 'clase' : 'clases' }}</span>
          <span>{{ course().durationSeconds | duration }}</span>
        </div>
      </div>
    </a>
  `,
  styles: `
    .course {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
      color: var(--text);
      height: 100%;
    }
    .cover {
      position: relative;
      aspect-ratio: 16 / 9;
      background:
        radial-gradient(circle at 80% 10%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 60%),
        linear-gradient(135deg, #1b2030, #10131b);
      display: grid;
      place-items: center;
    }
    .cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .initials {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: color-mix(in srgb, var(--accent) 70%, white);
      text-transform: uppercase;
      text-align: center;
      padding: 0 1rem;
    }
    .price {
      position: absolute;
      top: 0.7rem;
      right: 0.7rem;
      backdrop-filter: blur(6px);
    }
    .body {
      padding: 1.1rem 1.2rem 1.25rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .category {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    h3 {
      margin: 0.35rem 0 0.4rem;
    }
    p {
      font-size: 0.93rem;
      flex: 1;
    }
    .meta {
      display: flex;
      gap: 0.9rem;
      flex-wrap: wrap;
      font-size: 0.76rem;
      color: var(--muted);
    }
  `,
})
export class CourseCardComponent {
  readonly course = input.required<CourseCard>();
  protected readonly levels = LEVEL_LABELS;
}
