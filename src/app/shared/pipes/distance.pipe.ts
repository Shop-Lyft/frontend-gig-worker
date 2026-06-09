import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a numeric value as distance in kilometres with 1 decimal place.
 * Usage: {{ distanceKm | distance }} → "3.5 km"
 */
@Pipe({ name: 'distance', standalone: true })
export class DistancePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) {
      return '';
    }
    return value.toFixed(1) + ' km';
  }
}
