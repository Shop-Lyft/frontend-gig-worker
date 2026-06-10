import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * SkeletonLoaderComponent — animated pulse placeholder for loading states.
 *
 * Features:
 * - Configurable number of placeholder lines
 * - Optional avatar circle placeholder
 * - CSS pulse animation matching content layout
 * - Mobile-first (320–428px)
 */
@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton-loader.component.html',
  styleUrl: './skeleton-loader.component.scss'
})
export class SkeletonLoaderComponent {
  /** Number of placeholder lines to display */
  @Input() lines = 3;

  /** Whether to show an avatar circle placeholder */
  @Input() showAvatar = false;

  get linesArray(): number[] {
    return Array.from({ length: this.lines }, (_, i) => i);
  }

  /** Vary line widths for a more natural appearance */
  getLineWidth(index: number): string {
    const widths = ['100%', '85%', '70%', '90%', '60%'];
    return widths[index % widths.length];
  }
}
