import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CourseCard, LEVEL_LABELS } from '../core/models';
import { DurationPipe, PricePipe } from './format';
import { Icon, categoryIcon } from './icon';

@Component({
  selector: 'app-course-card',
  imports: [RouterLink, DurationPipe, PricePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="card hover course" [routerLink]="['/cursos', course().slug]">
      <div class="cover" [style.--accent]="course().category.color">
        @if (course().coverUrl; as cover) {
          <img [src]="cover" [alt]="''" loading="lazy" />
        } @else {
          <app-icon class="cover-icon" [name]="icon(course().category.slug)" [size]="60" [stroke]="1.6" />
        }
        <span class="badge price" [class.ok]="course().free" [class.gold]="!course().free">
          {{ course().price | price: course().currency }}
        </span>
      </div>
      <div class="body">
        <span class="category mono" [style.color]="course().category.color">{{ course().category.name }}</span>
        <h3>{{ course().title }}</h3>
        <p class="muted">{{ course().summary }}</p>
        <div class="meta">
          <span>{{ levels[course().level] }}</span>
          <span><app-icon name="play-circle" [size]="15" />{{ course().lessonCount }} {{ course().lessonCount === 1 ? 'clase' : 'clases' }}</span>
          <span><app-icon name="clock" [size]="15" />{{ course().durationSeconds | duration }}</span>
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
      background-color: color-mix(in srgb, var(--accent) 55%, #05070a);
      background-image: radial-gradient(rgb(255 255 255 / 14%) 1.5px, transparent 1.5px);
      background-size: 16px 16px;
      display: grid;
      place-items: center;
    }
    .cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .cover-icon {
      color: color-mix(in srgb, var(--accent) 25%, white);
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
      font-size: 1.25rem;
    }
    p {
      font-size: 0.93rem;
      flex: 1;
    }
    .meta {
      display: flex;
      gap: 0.5rem 1rem;
      flex-wrap: wrap;
      font-size: 0.85rem;
      color: var(--muted);
    }
    .meta span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
  `,
})
export class CourseCardComponent {
  readonly course = input.required<CourseCard>();
  protected readonly levels = LEVEL_LABELS;
  protected readonly icon = categoryIcon;
}
