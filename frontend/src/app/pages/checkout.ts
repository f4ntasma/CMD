import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BillingApi, CatalogApi } from '../core/api';
import { errorMessage } from '../core/http';
import { Order, PAYMENT_LABELS, PaymentMethod } from '../core/models';
import { Site } from '../core/site';
import { PricePipe } from '../shared/format';
import { loader } from '../shared/loader';

/** Compra con confirmación manual: el estudiante paga por fuera e informa su número de operación. */
@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container checkout">
      <a class="muted" [routerLink]="['/cursos', slug()]">← Volver al curso</a>
      @if (course.value(); as data) {
        <h1>Comprar curso</h1>
        <div class="grid-2">
          <div class="card stack">
            <span class="eyebrow">Resumen</span>
            <h2>{{ data.course.title }}</h2>
            <p class="muted">{{ data.course.summary }}</p>
            <p class="total">{{ data.course.price | price: data.course.currency }}</p>
            <div>
              <h3>Cómo pagar</h3>
              <p class="instructions">{{ site.settings()['payment_instructions'] }}</p>
            </div>
          </div>

          @if (order(); as placed) {
            <div class="card stack done">
              <img src="/mascot/spriteLaugh.webp" alt="" width="120" height="120" />
              <h2>¡Pago registrado!</h2>
              <p>
                Recibimos tu operación <strong class="mono">{{ placed.paymentReference }}</strong>. La revisaremos y
                tendrás acceso al curso en cuanto la confirmemos.
              </p>
              <a class="btn" routerLink="/mi-aprendizaje">Ver el estado de mi compra</a>
            </div>
          } @else {
            <form class="card stack" (ngSubmit)="submit()">
              <span class="eyebrow">Registra tu pago</span>
              @if (message(); as text) {
                <p class="alert error">{{ text }}</p>
              }
              <label>Medio de pago
                <select name="method" [(ngModel)]="method">
                  @for (option of methods; track option) {
                    <option [value]="option">{{ labels[option] }}</option>
                  }
                </select>
              </label>
              <label>Número de operación
                <input type="text" name="reference" [(ngModel)]="reference" required maxlength="80" />
                <span class="hint">Aparece en el comprobante de tu app de pagos.</span>
              </label>
              <button class="btn block" type="submit" [disabled]="busy() || !reference.trim()">Enviar para revisión</button>
            </form>
          }
        </div>
      } @else if (!course.loading()) {
        <p class="alert error">No encontramos ese curso.</p>
      }
    </div>
  `,
  styles: `
    .checkout {
      padding: 1.5rem 0 3rem;
    }
    h1 {
      margin: 1rem 0 1.5rem;
    }
    h2 {
      margin: 0;
      font-size: 1.4rem;
    }
    .total {
      font-size: 2rem;
      font-weight: 700;
      margin: 0;
    }
    .instructions {
      white-space: pre-wrap;
      margin: 0;
    }
    .done {
      align-items: flex-start;
    }
  `,
})
export class Checkout {
  private readonly billing = inject(BillingApi);
  private readonly catalog = inject(CatalogApi);
  protected readonly site = inject(Site);

  readonly slug = input.required<string>();

  protected readonly methods: PaymentMethod[] = ['YAPE', 'PLIN', 'TRANSFER', 'OTHER'];
  protected readonly labels = PAYMENT_LABELS;
  protected method: PaymentMethod = 'YAPE';
  protected reference = '';
  protected readonly busy = signal(false);
  protected readonly message = signal('');
  protected readonly order = signal<Order | null>(null);
  protected readonly course = loader(this.slug, (slug) => this.catalog.course(slug));

  protected submit(): void {
    this.busy.set(true);
    this.message.set('');
    this.billing.createOrder(this.slug(), this.method, this.reference).subscribe({
      next: (order) => {
        this.order.set(order);
        this.busy.set(false);
      },
      error: (error: unknown) => {
        this.message.set(errorMessage(error));
        this.busy.set(false);
      },
    });
  }
}
