import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { BillingApi, LearningApi } from '../core/api';
import { Auth } from '../core/auth';
import { ORDER_STATUS_LABELS, PAYMENT_LABELS } from '../core/models';
import { PricePipe, ShortDatePipe } from '../shared/format';

@Component({
  selector: 'app-my-learning',
  imports: [RouterLink, PricePipe, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <header class="page-title">
        <span class="eyebrow">Mi aprendizaje</span>
        <h1>Hola, {{ auth.user()?.displayName }}</h1>
        <p>Retoma tus cursos donde los dejaste.</p>
      </header>

      @if (courses(); as list) {
        @if (list.length === 0) {
          <div class="empty card">
            <img src="/mascot/spriteHaveIdea.webp" alt="" />
            <p>Aún no te has inscrito en ningún curso.</p>
            <a class="btn" routerLink="/cursos">Explorar cursos</a>
          </div>
        } @else {
          <div class="grid">
            @for (item of list; track item.course.id) {
              <div class="card stack">
                <span class="badge" [class.ok]="item.completed">{{ item.completed ? '✓ Completado' : item.course.category.name }}</span>
                <h3>{{ item.course.title }}</h3>
                <div>
                  <div class="spread muted mono small"><span>Progreso</span><span>{{ item.progressPercent }}%</span></div>
                  <div class="progress"><span [style.width.%]="item.progressPercent"></span></div>
                </div>
                <div class="row">
                  <a class="btn small" [routerLink]="['/cursos', item.course.slug]">{{ item.progressPercent === 0 ? 'Empezar' : item.completed ? 'Repasar' : 'Continuar' }}</a>
                  @if (item.certificateCode; as code) {
                    <a class="btn blue small" [routerLink]="['/certificados', code]">Certificado</a>
                  }
                </div>
              </div>
            }
          </div>
        }
      } @else {
        <div class="skeleton"></div>
      }

      @if (orders().length > 0) {
        <section class="section">
          <h2>Mis compras</h2>
          <div class="card table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Curso</th><th>Pago</th><th class="num">Importe</th><th>Estado</th></tr></thead>
              <tbody>
                @for (order of orders(); track order.id) {
                  <tr>
                    <td>{{ order.createdAt | shortDate }}</td>
                    <td><a [routerLink]="['/cursos', order.courseSlug]">{{ order.courseTitle }}</a></td>
                    <td>{{ payments[order.paymentMethod] }} · <span class="mono">{{ order.paymentReference }}</span></td>
                    <td class="num">{{ order.amount | price: order.currency }}</td>
                    <td>
                      <span class="badge" [class.ok]="order.status === 'APPROVED'" [class.gold]="order.status === 'PENDING'"
                            [class.danger]="order.status === 'REJECTED'">{{ statuses[order.status] }}</span>
                      @if (order.reviewNote) {
                        <div class="muted small">{{ order.reviewNote }}</div>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .small {
      font-size: 0.8rem;
    }
    h3 {
      margin: 0;
      flex: 1;
    }
    .badge {
      align-self: flex-start;
    }
  `,
})
export class MyLearning {
  protected readonly auth = inject(Auth);
  protected readonly payments = PAYMENT_LABELS;
  protected readonly statuses = ORDER_STATUS_LABELS;
  protected readonly courses = toSignal(inject(LearningApi).myCourses().pipe(catchError(() => of([]))));
  protected readonly orders = toSignal(inject(BillingApi).myOrders().pipe(catchError(() => of([]))), { initialValue: [] });
}
