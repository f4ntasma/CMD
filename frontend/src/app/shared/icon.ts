import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'arrow-right' | 'award' | 'book' | 'box' | 'check' | 'clock' | 'code' | 'coffee' | 'cpu' | 'database'
  | 'github' | 'menu' | 'message' | 'music' | 'play' | 'play-circle' | 'route' | 'shield' | 'users' | 'video' | 'x';

/** Icono de trazo (estilo Lucide) que hereda el color del texto. Decorativo salvo que se le dé `label`. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.width.px]': 'size()', '[style.height.px]': 'size()' },
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" [attr.stroke-width]="stroke()" stroke-linecap="round"
         stroke-linejoin="round" [attr.aria-hidden]="label() ? null : 'true'" [attr.role]="label() ? 'img' : null"
         [attr.aria-label]="label() || null">
      @switch (name()) {
        @case ('arrow-right') { <path d="M5 12h14M12 5l7 7-7 7" /> }
        @case ('award') { <circle cx="12" cy="8" r="6" /><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1" /> }
        @case ('book') { <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /> }
        @case ('box') {
          <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z" />
          <path d="M3.3 7 12 12l8.7-5M12 22V12" />
        }
        @case ('check') { <path d="M20 6 9 17l-5-5" /> }
        @case ('clock') { <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /> }
        @case ('code') { <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /> }
        @case ('coffee') { <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4zM6 1v3M10 1v3M14 1v3" /> }
        @case ('cpu') {
          <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
        }
        @case ('database') {
          <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
        }
        @case ('github') {
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.3 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1S18.7.7 16 2.5a13.4 13.4 0 0 0-7 0C6.3.7 5.1 1 5.1 1A5 5 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.4 3.3 6.6 6.4 7A3.4 3.4 0 0 0 9 18.1V22" />
        }
        @case ('menu') { <path d="M4 6h16M4 12h16M4 18h16" /> }
        @case ('message') {
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
        }
        @case ('music') { <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /> }
        @case ('play') { <path d="m6 3 14 9-14 9z" /> }
        @case ('play-circle') { <circle cx="12" cy="12" r="10" /><path d="m10 8 6 4-6 4z" /> }
        @case ('route') { <circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /> }
        @case ('shield') { <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /> }
        @case ('users') {
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
        }
        @case ('video') { <rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3z" /> }
        @case ('x') { <path d="M18 6 6 18M6 6l12 12" /> }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      flex-shrink: 0;
      line-height: 0;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly stroke = input(2);
  readonly label = input('');
}

/** Icono según la categoría del curso (por su slug). */
export function categoryIcon(slug: string): IconName {
  const icons: Record<string, IconName> = {
    'programacion-basica': 'code',
    poo: 'box',
    'base-de-datos': 'database',
    ciberseguridad: 'shield',
    'inteligencia-artificial': 'cpu',
  };
  return icons[slug] ?? 'book';
}
