import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { AdminApi } from '../../core/api';
import { AdminOrder, ORDER_STATUS_LABELS, OrderStatus, PAYMENT_LABELS } from '../../core/models';
import { Toasts } from '../../core/toasts';
import { PricePipe, ShortDatePipe } from '../../shared/format';

@Component({
  selector: 'app-admin-orders',
  imports: [PricePipe, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Pagos</h1>
    <p class="muted">Comprueba cada operación en tu Yape, Plin o banco antes de aprobarla. Al aprobar, el estudiante recibe acceso al curso.</p>

    <div class="row tabs">
      @for (option of statuses; track option) {
        <button class="btn small" type="button" [class.ghost]="status() !== option" (click)="status.set(option)">{{ labels[option] }}</button>
      }
    </div>

    <div class="card table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Estudiante</th><th>Curso</th><th>Pago</th><th class="num">Importe</th><th></th></tr></thead>
        <tbody>
          @for (entry of orders(); track entry.order.id) {
            <tr>
              <td>{{ entry.order.createdAt | shortDate }}</td>
              <td>{{ entry.userName }}<div class="muted small">{{ entry.userEmail }}</div></td>
              <td>{{ entry.order.courseTitle }}</td>
              <td>{{ payments[entry.order.paymentMethod] }}<div class="mono">{{ entry.order.paymentReference }}</div></td>
              <td class="num">{{ entry.order.amount | price: entry.order.currency }}</td>
              <td class="num">
                @if (entry.order.status === 'PENDING') {
                  <div class="row end">
                    <button class="btn small" type="button" (click)="review(entry, true)">Aprobar</button>
                    <button class="btn danger small" type="button" (click)="review(entry, false)">Rechazar</button>
                  </div>
                } @else {
                  <span class="muted small">{{ entry.order.reviewNote }}</span>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="muted">No hay pagos en este estado.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .tabs {
      margin: 1rem 0;
    }
    .small {
      font-size: 0.8rem;
    }
    .end {
      justify-content: flex-end;
    }
  `,
})
export class AdminOrders {
  private readonly api = inject(AdminApi);
  private readonly toasts = inject(Toasts);

  protected readonly statuses: OrderStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
  protected readonly labels = ORDER_STATUS_LABELS;
  protected readonly payments = PAYMENT_LABELS;
  protected readonly status = signal<OrderStatus>('PENDING');
  protected readonly orders = signal<AdminOrder[]>([]);

  constructor() {
    effect(() => this.load(this.status()));
  }

  private load(status: OrderStatus): void {
    this.api.orders(status).subscribe({ next: (page) => this.orders.set(page.content), error: (e: unknown) => this.toasts.error(e) });
  }

  protected review(entry: AdminOrder, approve: boolean): void {
    let note = '';
    if (!approve) {
      const reason = prompt('Motivo del rechazo (lo verá el estudiante):', 'No encontramos el pago con ese número de operación');
      if (reason === null) {
        return;
      }
      note = reason;
    } else if (!confirm(`¿Aprobar el pago ${entry.order.paymentReference} de ${entry.userName}?`)) {
      return;
    }
    this.api.reviewOrder(entry.order.id, approve, note).subscribe({
      next: () => {
        this.toasts.ok(approve ? 'Pago aprobado: el estudiante ya tiene acceso' : 'Pago rechazado');
        this.load(this.status());
      },
      error: (error: unknown) => this.toasts.error(error),
    });
  }
}
