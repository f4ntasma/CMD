import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LearningApi } from '../core/api';
import { ShortDatePipe } from '../shared/format';
import { loader } from '../shared/loader';

/** Verificación pública de un certificado por su código. */
@Component({
  selector: 'app-certificate',
  imports: [RouterLink, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container section">
      @if (certificate.value(); as data) {
        <div class="panel sheet">
          <img src="/mascot/spriteCool.webp" alt="" width="130" height="130" />
          <span class="badge ok">✓ Certificado válido</span>
          <span class="eyebrow">Monkey Coffe Dev's certifica que</span>
          <h1>{{ data.studentName }}</h1>
          <p class="muted">completó el curso</p>
          <h2><a [routerLink]="['/cursos', data.courseSlug]">{{ data.courseTitle }}</a></h2>
          <p class="mono muted">Emitido el {{ data.issuedAt | shortDate }} · Código {{ data.code }}</p>
          <a class="btn" [href]="'/api/certificates/' + data.code + '/pdf'" target="_blank" rel="noopener">Descargar PDF</a>
        </div>
      } @else if (!certificate.loading()) {
        <div class="empty">
          <img src="/mascot/spriteThink.webp" alt="" />
          <h2>Certificado no encontrado</h2>
          <p>El código <strong class="mono">{{ code() }}</strong> no corresponde a ningún certificado emitido.</p>
        </div>
      }
    </div>
  `,
  styles: `
    .sheet {
      max-width: 720px;
      margin-inline: auto;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
    }
    .sheet h1 {
      margin: 0;
      color: var(--blue-soft);
    }
    .sheet h2 {
      margin: 0 0 0.6rem;
    }
    .sheet .eyebrow {
      margin: 1rem 0 0.3rem;
    }
  `,
})
export class CertificatePage {
  private readonly api = inject(LearningApi);
  readonly code = input.required<string>();
  protected readonly certificate = loader(this.code, (code) => this.api.certificate(code));
}
