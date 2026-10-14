import { Injectable, signal } from '@angular/core';
import { errorMessage } from './http';

export interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'error';
}

/** Avisos breves en la esquina de la pantalla. */
@Injectable({ providedIn: 'root' })
export class Toasts {
  private nextId = 1;
  readonly items = signal<Toast[]>([]);

  ok(text: string): void {
    this.push(text, 'ok');
  }

  error(error: unknown): void {
    this.push(typeof error === 'string' ? error : errorMessage(error), 'error');
  }

  dismiss(id: number): void {
    this.items.update((items) => items.filter((item) => item.id !== id));
  }

  private push(text: string, kind: Toast['kind']): void {
    const id = this.nextId++;
    this.items.update((items) => [...items, { id, text, kind }]);
    setTimeout(() => this.dismiss(id), kind === 'ok' ? 4000 : 7000);
  }
}
