import { Injectable, signal, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  calculateBackoff,
  MAX_RECONNECT_ATTEMPTS,
} from '../utils/backoff.utils';

// --- WebSocket Message Types ---

export type ConnectionStatus =
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

export interface LocationPayload {
  latitude: number;
  longitude: number;
  timestamp: string;
  stale?: boolean;
}

export interface WsClientMessage {
  type: 'location_update' | 'heartbeat' | 'subscribe';
  payload?: LocationPayload;
}

export interface JobAvailablePayload {
  jobId: string;
  jobType: 'shopper' | 'driver';
  storeName: string;
  storeLatitude: number;
  storeLongitude: number;
  itemCount: number;
  estimatedPay: number;
}

export interface JobTakenPayload {
  jobId: string;
}

export interface SubstitutionResponsePayload {
  orderId: string;
  itemId: string;
  approved: boolean;
  substituteName?: string;
  substituteQuantity?: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface ServerMessage {
  type:
    | 'job_available'
    | 'job_taken'
    | 'substitution_response'
    | 'pong'
    | 'error';
  payload:
    | JobAvailablePayload
    | JobTakenPayload
    | SubstitutionResponsePayload
    | ErrorPayload;
}

// --- WebSocket Service ---

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  /** Signal exposing the current WebSocket connection status. */
  readonly connectionStatus = signal<ConnectionStatus>('disconnected');

  /** Observable stream of parsed server messages. */
  get messages$(): Observable<ServerMessage> {
    return this._messages$.asObservable();
  }

  private _messages$ = new Subject<ServerMessage>();
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private manualDisconnect = false;

  ngOnDestroy(): void {
    this.disconnect();
    this._messages$.complete();
  }

  /**
   * Opens a WebSocket connection to the backend with JWT authentication.
   * Starts the heartbeat interval upon successful connection.
   *
   * @param token - JWT auth token passed as a query parameter
   */
  connect(token: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    this.token = token;
    this.manualDisconnect = false;
    this.openConnection();
  }

  /**
   * Gracefully closes the WebSocket connection and stops all timers.
   * Does not trigger reconnection.
   */
  disconnect(): void {
    this.manualDisconnect = true;
    this.cleanup();
    this.connectionStatus.set('disconnected');
  }

  /**
   * Sends a location update message through the WebSocket.
   *
   * @param lat - Latitude (-90 to 90, 7 decimal places)
   * @param lng - Longitude (-180 to 180, 7 decimal places)
   * @param timestamp - ISO 8601 timestamp
   * @param stale - Optional flag indicating GPS signal loss > 60s
   */
  sendLocationUpdate(
    lat: number,
    lng: number,
    timestamp: string,
    stale?: boolean
  ): void {
    const message: WsClientMessage = {
      type: 'location_update',
      payload: {
        latitude: lat,
        longitude: lng,
        timestamp,
        stale,
      },
    };
    this.send(message);
  }

  /**
   * Sends a heartbeat message to the server to maintain the connection.
   */
  sendHeartbeat(): void {
    const message: WsClientMessage = { type: 'heartbeat' };
    this.send(message);
  }

  // --- Private Methods ---

  private openConnection(): void {
    const url = `${environment.wsUrl}?token=${this.token}`;

    try {
      this.socket = new WebSocket(url);
    } catch {
      this.handleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.connectionStatus.set('connected');
      this.startHeartbeat();
    };

    this.socket.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };

    this.socket.onclose = () => {
      this.stopHeartbeat();
      if (!this.manualDisconnect) {
        this.handleReconnect();
      }
    };

    this.socket.onerror = () => {
      // The close event will fire after an error, triggering reconnection
      if (this.socket) {
        this.socket.close();
      }
    };
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: ServerMessage = JSON.parse(event.data);
      this._messages$.next(message);
    } catch {
      // Silently ignore malformed messages
    }
  }

  private handleReconnect(): void {
    this.reconnectAttempts++;

    if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      this.connectionStatus.set('failed');
      this.cleanup();
      return;
    }

    this.connectionStatus.set('reconnecting');
    const delay = calculateBackoff(this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openConnection();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private send(message: WsClientMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private cleanup(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;

      if (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      ) {
        this.socket.close();
      }
      this.socket = null;
    }

    this.reconnectAttempts = 0;
  }
}
