import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Job } from '../../../core/models/job.model';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { DistancePipe } from '../../../shared/pipes/distance.pipe';
import * as ActiveJobActions from '../../../store/active-job/active-job.actions';
import { selectActiveJobError } from '../../../store/active-job/active-job.selectors';

/**
 * DeliveryComponent displays the active delivery job details for a Driver.
 *
 * Features:
 * - Order number header formatted as "#SL-[orderNumber]"
 * - Customer delivery address and store pickup address display
 * - Distance display in km with 1 decimal place
 * - "Navigate" button to open device navigation app
 * - "Complete Delivery" button dispatching completeDelivery action
 * - "Call Customer" button using tel: link
 * - GPS tracking indicator with 5s broadcast interval
 * - Stale GPS warning when signal lost > 60s
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 */
@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CommonModule, DistancePipe],
  template: `
    <div class="delivery-container">
      <!-- Order Header -->
      <div class="order-header">
        <h2 class="order-number">#SL-{{ job.orderId }}</h2>
        <span class="job-badge">Delivery</span>
      </div>

      <!-- GPS Tracking Indicator -->
      <div class="gps-indicator" [class.gps-stale]="gpsStale()">
        @if (!gpsStale()) {
          <span class="gps-dot"></span>
          <span class="gps-text">GPS Active</span>
        } @else {
          <span class="gps-dot gps-dot-warning"></span>
          <span class="gps-text gps-text-warning">GPS Signal Lost</span>
        }
      </div>

      <!-- Delivery Info Section -->
      <div class="delivery-info">
        <div class="info-card">
          <div class="info-label">Store Pickup</div>
          <div class="info-value">{{ job.storeName }}</div>
          <div class="info-address">{{ getStoreAddress() }}</div>
        </div>

        <div class="info-card">
          <div class="info-label">Customer Address</div>
          <div class="info-value">{{ job.customerAddress || 'Address not available' }}</div>
        </div>

        <div class="info-card distance-card">
          <div class="info-label">Distance</div>
          <div class="info-value distance-value">{{ job.distance | distance }}</div>
        </div>
      </div>

      <!-- Error Message -->
      @if (error()) {
        <div class="error-message">
          <span class="error-icon">⚠</span>
          <span>{{ error()!.message }}</span>
        </div>
      }

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button
          class="btn btn-navigate"
          (click)="onNavigate()"
          type="button"
          aria-label="Navigate to customer address"
        >
          <span class="btn-icon">🧭</span>
          Navigate
        </button>

        <a
          class="btn btn-call"
          [href]="getCustomerPhoneLink()"
          aria-label="Call Customer"
        >
          <span class="btn-icon">📞</span>
          Call Customer
        </a>

        <button
          class="btn btn-complete"
          (click)="onCompleteDelivery()"
          [disabled]="completing()"
          type="button"
          aria-label="Complete Delivery"
        >
          @if (completing()) {
            <span class="spinner"></span>
            Completing...
          } @else {
            <span class="btn-icon">✓</span>
            Complete Delivery
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .delivery-container {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .order-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .order-number {
      font-size: 1.25rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0;
    }

    .job-badge {
      background: #10b981;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .gps-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 8px;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .gps-indicator.gps-stale {
      background: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.3);
    }

    .gps-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 2s infinite;
    }

    .gps-dot-warning {
      background: #f59e0b;
      animation: none;
    }

    .gps-text {
      font-size: 0.85rem;
      color: #10b981;
      font-weight: 500;
    }

    .gps-text-warning {
      color: #f59e0b;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .delivery-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .info-card {
      background: #1e293b;
      border-radius: 12px;
      padding: 14px 16px;
    }

    .info-label {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .info-value {
      font-size: 0.95rem;
      color: #ffffff;
      font-weight: 500;
    }

    .info-address {
      font-size: 0.85rem;
      color: #94a3b8;
      margin-top: 2px;
    }

    .distance-value {
      font-size: 1.1rem;
      color: #10b981;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      color: #ef4444;
      font-size: 0.85rem;
    }

    .error-icon {
      flex-shrink: 0;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 8px;
    }

    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      text-decoration: none;
      text-align: center;
      transition: opacity 0.2s;
    }

    .btn:active {
      opacity: 0.8;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-navigate {
      background: #3b82f6;
      color: #ffffff;
    }

    .btn-call {
      background: #1e293b;
      color: #ffffff;
      border: 1px solid #334155;
    }

    .btn-complete {
      background: #10b981;
      color: #ffffff;
    }

    .btn-icon {
      font-size: 1.1rem;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class DeliveryComponent implements OnInit, OnDestroy {
  @Input({ required: true }) job!: Job;

  private store = inject(Store);
  private geolocationService = inject(GeolocationService);
  private webSocketService = inject(WebSocketService);

  private gpsBroadcastTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly GPS_BROADCAST_INTERVAL_MS = 5000;

  /** Whether delivery completion is in progress. */
  completing = signal(false);

  /** GPS stale state from GeolocationService. */
  gpsStale = this.geolocationService.isStale;

  /** Error from the store. */
  error = signal<{ message: string; timestamp: number } | null>(null);

  /** Store pickup address (using store name as the pickup location identifier). */
  getStoreAddress(): string {
    return this.job?.storeName || 'Store address';
  }

  /** Customer phone tel: link. */
  getCustomerPhoneLink(): string {
    return this.job?.customerPhone ? `tel:${this.job.customerPhone}` : 'tel:';
  }

  private errorSubscription: any;

  ngOnInit(): void {
    // Start GPS tracking at active job interval (10s per GeolocationService)
    this.geolocationService.startTracking(GeolocationService.ACTIVE_INTERVAL_MS);

    // Start GPS broadcast via WebSocket every 5s
    this.startGpsBroadcast();

    // Subscribe to store errors for delivery completion
    this.errorSubscription = this.store.select(selectActiveJobError).subscribe((error) => {
      this.error.set(error);
      if (error) {
        this.completing.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopGpsBroadcast();
    this.geolocationService.stopTracking();
    if (this.errorSubscription) {
      this.errorSubscription.unsubscribe();
    }
  }

  /**
   * Opens the device's navigation application with the customer address as destination.
   * Falls back to showing an error if navigation cannot be launched.
   * Requirement: 9.2, 9.8
   */
  onNavigate(): void {
    const address = this.job.customerAddress;
    if (!address) {
      this.error.set({
        message: 'Customer address not available for navigation.',
        timestamp: Date.now(),
      });
      return;
    }

    const encodedAddress = encodeURIComponent(address);
    const navUrl = `https://maps.google.com/maps?daddr=${encodedAddress}`;

    try {
      const opened = window.open(navUrl, '_blank');
      if (!opened) {
        this.error.set({
          message: 'Navigation could not be launched. Please use the address above manually.',
          timestamp: Date.now(),
        });
      }
    } catch {
      this.error.set({
        message: 'Navigation could not be launched. Please use the address above manually.',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Dispatches completeDelivery action to the store.
   * Requirement: 9.3, 9.4, 9.5
   */
  onCompleteDelivery(): void {
    if (this.completing()) {
      return;
    }

    this.completing.set(true);
    this.error.set(null);
    this.store.dispatch(
      ActiveJobActions.completeDelivery({ orderId: this.job.orderId })
    );
  }

  /**
   * Starts broadcasting GPS location via WebSocket every 5 seconds.
   * Requirement: 9.6 (5s GPS broadcast for delivery tracking)
   */
  private startGpsBroadcast(): void {
    this.stopGpsBroadcast();

    // Immediately send a location update
    this.broadcastLocation();

    this.gpsBroadcastTimer = setInterval(() => {
      this.broadcastLocation();
    }, DeliveryComponent.GPS_BROADCAST_INTERVAL_MS);
  }

  /**
   * Stops the GPS broadcast interval.
   */
  private stopGpsBroadcast(): void {
    if (this.gpsBroadcastTimer !== null) {
      clearInterval(this.gpsBroadcastTimer);
      this.gpsBroadcastTimer = null;
    }
  }

  /**
   * Sends the current GPS position via WebSocket.
   * Includes stale flag if GPS signal is lost.
   */
  private broadcastLocation(): void {
    const position = this.geolocationService.currentPosition();
    if (!position) {
      return;
    }

    const isStale = this.geolocationService.isStale();
    this.webSocketService.sendLocationUpdate(
      position.lat,
      position.lng,
      new Date().toISOString(),
      isStale || undefined
    );
  }
}
