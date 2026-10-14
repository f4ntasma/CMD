import { ChangeDetectionStrategy, Component, RESPONSE_INIT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container empty">
      <img src="/mascot/spriteThink.webp" alt="" />
      <h1 class="mono">404</h1>
      <p>Esta página se fue por un café y no volvió.</p>
      <a class="btn" routerLink="/">Volver al inicio</a>
    </div>
  `,
})
export class NotFound {
  constructor() {
    // En el render del servidor, responde 404 para que buscadores y monitores no la tomen por una página válida.
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) {
      response.status = 404;
    }
  }
}
