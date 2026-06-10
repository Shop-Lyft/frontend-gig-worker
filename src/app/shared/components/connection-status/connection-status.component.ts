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
  templateUrl: './connection-status.component.html',
  styleUrl: './connection-status.component.scss'
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
