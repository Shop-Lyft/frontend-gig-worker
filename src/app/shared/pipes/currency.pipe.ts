import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a numeric value as South African Rand currency.
 * Usage: {{ amount | zarCurrency }} → "R45.50"
 */
@Pipe({ name: 'zarCurrency', standalone: true })
export class ZarCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) {
      return '';
    }
    return 'R' + value.toFixed(2);
  }
}
