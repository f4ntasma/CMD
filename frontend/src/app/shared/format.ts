import { Pipe, PipeTransform } from '@angular/core';

/** 5400 → "1 h 30 min"; 600 → "10 min". */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(seconds: number | null | undefined): string {
    const minutes = Math.round((seconds ?? 0) / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
  }
}

const CURRENCY_SYMBOLS: Record<string, string> = { PEN: 'S/', USD: '$', EUR: '€' };

/** Precio de un curso: "Gratis" o "S/ 49.90". */
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(amount: number | null | undefined, currency = 'PEN'): string {
    if (!amount) {
      return 'Gratis';
    }
    return `${CURRENCY_SYMBOLS[currency] ?? currency} ${Number(amount).toFixed(2)}`;
  }
}

/** Fecha corta en español: "13 oct 2026". Se fija la zona para que servidor y navegador coincidan. */
@Pipe({ name: 'shortDate' })
export class ShortDatePipe implements PipeTransform {
  private static readonly FORMAT = new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Lima',
  });

  transform(iso: string | null | undefined): string {
    return iso ? ShortDatePipe.FORMAT.format(new Date(iso)) : '';
  }
}
