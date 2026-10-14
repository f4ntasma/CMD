import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../core/api';
import { PricePipe } from '../../shared/format';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Resumen</h1>
    @if (stats(); as data) {
      <div class="tiles">
        <div class="card"><span class="value">{{ data.students }}</span><span class="muted">Estudiantes</span></div>
        <div class="card"><span class="value">{{ data.publishedCourses }}</span><span class="muted">Cursos publicados</span></div>
        <div class="card"><span class="value">{{ data.enrollments }}</span><span class="muted">Inscripciones</span></div>
        <div class="card"><span class="value">{{ data.completedCourses }}</span><span class="muted">Cursos completados</span></div>
        <div class="card"><span class="value">{{ data.revenue | price }}</span><span class="muted">Ingresos confirmados</span></div>
        <a class="card hover" [class.attention]="data.pendingOrders > 0" routerLink="/admin/ordenes">
          <span class="value">{{ data.pendingOrders }}</span><span class="muted">Pagos por revisar →</span>
        </a>
      </div>
    } @else {
      <div class="skeleton"></div>
    }

    <div class="card start">
      <h2>Para publicar tu primer curso</h2>
      <ol>
        <li>En <a routerLink="/admin/ajustes">Ajustes del sitio</a>, pon tus redes, tu Discord y cómo pagar.</li>
        <li>En <a routerLink="/admin/cursos">Cursos</a>, crea el curso y añade módulos y clases.</li>
        <li>Sube cada video a YouTube como «No listado» y pega su enlace en la clase.</li>
        <li>Cambia el estado del curso a «Publicado».</li>
      </ol>
    </div>
  `,
  styles: `
    .tiles {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
    .tiles .card {
      display: flex;
      flex-direction: column;
      color: var(--text);
    }
    .value {
      font-size: 1.9rem;
      font-weight: 700;
    }
    .attention {
      border-color: var(--gold);
    }
    .start {
      margin-top: 1.5rem;
    }
    .start h2 {
      font-size: 1.2rem;
    }
    ol {
      margin: 0;
      padding-left: 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
  `,
})
export class Dashboard {
  protected readonly stats = toSignal(inject(AdminApi).stats());
}
