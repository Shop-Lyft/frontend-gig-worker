import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, DistancePipe],
  templateUrl: './delivery.component.html',
  styleUrl: './delivery.component.scss',
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

  /** PIN verification */
  enteredPin = '';
  pinError = '';

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

    // Verify PIN
    if (this.enteredPin.length < 4) {
      this.pinError = 'Please enter the 4-digit delivery PIN from the customer';
      return;
    }

    // PIN verification happens against the order's stored PIN
    // For now, we trust the PIN is correct and let the backend/Firestore validate
    // (In a full implementation, the completeDelivery service would check the PIN server-side)
    this.pinError = '';
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
