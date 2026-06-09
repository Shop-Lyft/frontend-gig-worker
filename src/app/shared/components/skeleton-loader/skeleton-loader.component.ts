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
  template: `
    <div class="skeleton-container" aria-busy="true" aria-label="Loading content">
      @if (showAvatar) {
        <div class="skeleton-avatar"></div>
      }
      <div class="skeleton-lines">
        @for (line of linesArray; track $index) {
          <div
            class="skeleton-line"
            [style.width]="getLineWidth($index)"
          ></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .skeleton-container {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: #1e293b;
      border-radius: 12px;
      margin-bottom: 12px;
    }

    .skeleton-avatar {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #334155;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .skeleton-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .skeleton-line {
      height: 14px;
      border-radius: 4px;
      background: #334155;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }
  `]
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
