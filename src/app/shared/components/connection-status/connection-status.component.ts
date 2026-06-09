import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { WebSocketService, ConnectionStatus } from '../../../core/services/websocket.service';

/**
 * ConnectionStatusComponent — displays connection-related banners.
 *
 * Features:
 * - "Reconnecting..." banner when WebSocket is reconnecting (yellow)
 * - "You are offline" banner when device has no network (red)
 * - Smooth slide-down animation
 * - Auto-hides when connection is restored
 */
@Component({
  selector: 'app-connection-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showBanner()) {
      <div
        class="connection-banner"
        [class.offline]="isOffline()"
        [class.reconnecting]="isReconnecting()"
        role="status"
        aria-live="polite"
      >
        <div class="banner-content">
          @if (isOffline()) {
            <svg class="banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
              <line x1="12" y1="20" x2="12.01" y2="20"/>
            </svg>
            <span class="banner-text">You are offline</span>
          } @else {
            <span class="spinner" aria-hidden="true"></span>
            <span class="banner-text">Reconnecting...</span>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .connection-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1100;
      padding: 10px 16px;
      padding-top: calc(env(safe-area-inset-top, 0px) + 10px);
      animation: slideDown 0.3s ease-out;
    }

    .connection-banner.offline {
      background: rgba(239, 68, 68, 0.95);
    }

    .connection-banner.reconnecting {
      background: rgba(234, 179, 8, 0.95);
    }

    .banner-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .banner-icon {
      width: 18px;
      height: 18px;
      color: #ffffff;
    }

    .banner-text {
      font-size: 13px;
      font-weight: 600;
      color: #ffffff;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ConnectionStatusComponent {
  private readonly connectivity = inject(ConnectivityService);
  private readonly webSocket = inject(WebSocketService);

  /** True when the device is offline */
  readonly isOffline = computed(() => !this.connectivity.isOnline());

  /** True when WebSocket is in reconnecting state */
  readonly isReconnecting = computed(() => {
    const wsStatus: ConnectionStatus = this.webSocket.connectionStatus();
    return wsStatus === 'reconnecting' && this.connectivity.isOnline();
  });

  /** True when any banner should be shown */
  readonly showBanner = computed(() => this.isOffline() || this.isReconnecting());
}
