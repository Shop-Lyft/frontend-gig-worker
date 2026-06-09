import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { DeliveryComponent } from './delivery.component';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { Job } from '../../../core/models/job.model';
import * as ActiveJobActions from '../../../store/active-job/active-job.actions';
import { selectActiveJobError } from '../../../store/active-job/active-job.selectors';
import { signal } from '@angular/core';

describe('DeliveryComponent', () => {
  let component: DeliveryComponent;
  let fixture: ComponentFixture<DeliveryComponent>;
  let store: MockStore;
  let mockGeolocationService: jasmine.SpyObj<GeolocationService>;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;

  const mockJob: Job = {
    id: 'job-1',
    orderId: 'order-123',
    storeId: 'store-1',
    jobType: 'driver',
    status: 'in_delivery',
    storeName: 'Test Store',
    storeLatitude: -26.2041,
    storeLongitude: 28.0473,
    itemCount: 5,
    estimatedPay: 45.50,
    distance: 3.7,
    customerAddress: '123 Main St, Johannesburg',
    customerPhone: '+27123456789',
    createdAt: '2024-01-01T10:00:00Z',
  };

  beforeEach(async () => {
    mockGeolocationService = jasmine.createSpyObj(
      'GeolocationService',
      ['startTracking', 'stopTracking'],
      {
        currentPosition: signal({ lat: -26.2041, lng: 28.0473 }),
        isStale: signal(false),
        permissionStatus: signal('granted'),
        lastFixTimestamp: signal(Date.now()),
      }
    );

    mockWebSocketService = jasmine.createSpyObj('WebSocketService', [
      'sendLocationUpdate',
    ]);

    await TestBed.configureTestingModule({
      imports: [DeliveryComponent],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectActiveJobError, value: null },
          ],
        }),
        { provide: GeolocationService, useValue: mockGeolocationService },
        { provide: WebSocketService, useValue: mockWebSocketService },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(DeliveryComponent);
    component = fixture.componentInstance;
    component.job = mockJob;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display the order number formatted as #SL-[orderId]', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.order-number');
    expect(el.textContent).toContain('#SL-order-123');
  });

  it('should display customer address', () => {
    fixture.detectChanges();
    const infoValues = fixture.nativeElement.querySelectorAll('.info-value');
    const addresses = Array.from(infoValues).map((el: any) => el.textContent.trim());
    expect(addresses).toContain('123 Main St, Johannesburg');
  });

  it('should display store name', () => {
    fixture.detectChanges();
    const infoValues = fixture.nativeElement.querySelectorAll('.info-value');
    const values = Array.from(infoValues).map((el: any) => el.textContent.trim());
    expect(values).toContain('Test Store');
  });

  it('should display distance with 1 decimal place and km', () => {
    fixture.detectChanges();
    const distanceEl = fixture.nativeElement.querySelector('.distance-value');
    expect(distanceEl.textContent.trim()).toBe('3.7 km');
  });

  it('should display GPS Active indicator when GPS is not stale', () => {
    fixture.detectChanges();
    const gpsText = fixture.nativeElement.querySelector('.gps-text');
    expect(gpsText.textContent.trim()).toBe('GPS Active');
  });

  it('should display GPS Signal Lost warning when GPS is stale', async () => {
    // Need to create a new fixture with stale GPS
    const staleGeoService = jasmine.createSpyObj(
      'GeolocationService',
      ['startTracking', 'stopTracking'],
      {
        currentPosition: signal({ lat: -26.2041, lng: 28.0473 }),
        isStale: signal(true),
        permissionStatus: signal('granted'),
        lastFixTimestamp: signal(Date.now()),
      }
    );

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DeliveryComponent],
      providers: [
        provideMockStore({
          selectors: [{ selector: selectActiveJobError, value: null }],
        }),
        { provide: GeolocationService, useValue: staleGeoService },
        { provide: WebSocketService, useValue: mockWebSocketService },
      ],
    }).compileComponents();

    const staleFixture = TestBed.createComponent(DeliveryComponent);
    const staleComponent = staleFixture.componentInstance;
    staleComponent.job = mockJob;
    staleFixture.detectChanges();

    const gpsText = staleFixture.nativeElement.querySelector('.gps-text-warning');
    expect(gpsText).toBeTruthy();
    expect(gpsText.textContent.trim()).toBe('GPS Signal Lost');

    staleComponent.ngOnDestroy();
  });

  it('should have a Call Customer link with correct tel: href', () => {
    fixture.detectChanges();
    const callLink = fixture.nativeElement.querySelector('.btn-call');
    expect(callLink.getAttribute('href')).toBe('tel:+27123456789');
  });

  it('should start GPS tracking on init with active interval', () => {
    fixture.detectChanges();
    expect(mockGeolocationService.startTracking).toHaveBeenCalledWith(
      GeolocationService.ACTIVE_INTERVAL_MS
    );
  });

  it('should broadcast location via WebSocket on init', () => {
    fixture.detectChanges();
    expect(mockWebSocketService.sendLocationUpdate).toHaveBeenCalledWith(
      -26.2041,
      28.0473,
      jasmine.any(String),
      undefined
    );
  });

  it('should dispatch completeDelivery action when Complete Delivery button clicked', () => {
    fixture.detectChanges();
    spyOn(store, 'dispatch');

    const completeBtn = fixture.nativeElement.querySelector('.btn-complete');
    completeBtn.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      ActiveJobActions.completeDelivery({ orderId: 'order-123' })
    );
  });

  it('should set completing to true when Complete Delivery is clicked', () => {
    fixture.detectChanges();
    spyOn(store, 'dispatch');

    component.onCompleteDelivery();

    expect(component.completing()).toBeTrue();
  });

  it('should not dispatch if already completing', () => {
    fixture.detectChanges();
    spyOn(store, 'dispatch');

    component.completing.set(true);
    component.onCompleteDelivery();

    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('should open Google Maps with encoded customer address on Navigate', () => {
    fixture.detectChanges();
    spyOn(window, 'open').and.returnValue({} as Window);

    component.onNavigate();

    expect(window.open).toHaveBeenCalledWith(
      'https://maps.google.com/maps?daddr=123%20Main%20St%2C%20Johannesburg',
      '_blank'
    );
  });

  it('should show error if navigation fails (popup blocked)', () => {
    fixture.detectChanges();
    spyOn(window, 'open').and.returnValue(null);

    component.onNavigate();

    expect(component.error()).toBeTruthy();
    expect(component.error()!.message).toContain('Navigation could not be launched');
  });

  it('should show error if customer address not available for navigation', () => {
    component.job = { ...mockJob, customerAddress: undefined };
    fixture.detectChanges();

    component.onNavigate();

    expect(component.error()).toBeTruthy();
    expect(component.error()!.message).toContain('Customer address not available');
  });

  it('should stop GPS tracking and broadcast on destroy', () => {
    fixture.detectChanges();
    component.ngOnDestroy();
    expect(mockGeolocationService.stopTracking).toHaveBeenCalled();
  });

  it('should display "Address not available" when customerAddress is missing', () => {
    component.job = { ...mockJob, customerAddress: undefined };
    fixture.detectChanges();

    const infoValues = fixture.nativeElement.querySelectorAll('.info-value');
    const values = Array.from(infoValues).map((el: any) => el.textContent.trim());
    expect(values).toContain('Address not available');
  });

  it('should display error message when store error is set', () => {
    fixture.detectChanges();
    component.error.set({ message: 'Delivery completion failed', timestamp: Date.now() });
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.error-message');
    expect(errorEl.textContent).toContain('Delivery completion failed');
  });

  it('should reset completing state when error occurs', () => {
    fixture.detectChanges();
    component.completing.set(true);

    store.overrideSelector(selectActiveJobError, { message: 'Failed', timestamp: Date.now() });
    store.refreshState();

    expect(component.completing()).toBeFalse();
  });
});
