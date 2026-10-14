import { Signal, computed, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, of, switchMap, tap } from 'rxjs';

export interface Loader<T> {
  /** Último valor cargado; nulo mientras carga por primera vez o si falló. */
  readonly value: Signal<T | null>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<unknown>;
  reload(): void;
  set(value: T): void;
}

/**
 * Carga datos cada vez que cambia {@code param} (p. ej. el slug de la ruta) y expone el resultado como
 * señales. Una petición nueva cancela la anterior. Debe llamarse en el constructor o en un inicializador
 * de campo del componente.
 */
export function loader<P, T>(param: () => P, fetch: (param: P) => Observable<T>): Loader<T> {
  const value = signal<T | null>(null);
  const loading = signal(true);
  const error = signal<unknown>(null);
  const tick = signal(0);

  toObservable(computed(() => ({ param: param(), tick: tick() })))
    .pipe(
      tap(() => {
        loading.set(true);
        error.set(null);
      }),
      switchMap((trigger) =>
        fetch(trigger.param).pipe(
          catchError((failure: unknown) => {
            error.set(failure);
            return of(null);
          }),
        ),
      ),
      takeUntilDestroyed(),
    )
    .subscribe((result) => {
      value.set(result);
      loading.set(false);
    });

  return {
    value,
    loading,
    error,
    reload: () => tick.update((count) => count + 1),
    set: (next: T) => value.set(next),
  };
}
