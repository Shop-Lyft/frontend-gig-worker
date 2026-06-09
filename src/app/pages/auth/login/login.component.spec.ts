import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { LoginComponent } from './login.component';
import { AuthState, initialState } from '../../../store/auth/auth.reducer';
import * as AuthActions from '../../../store/auth/auth.actions';
import {
  selectLoginLoading,
  selectLoginError,
  selectIsLockedOut,
  selectLockoutUntil,
} from '../../../store/auth/auth.selectors';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let store: MockStore;

  const authInitialState: AuthState = { ...initialState };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule, RouterTestingModule],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectLoginLoading, value: false },
            { selector: selectLoginError, value: null },
            { selector: selectIsLockedOut, value: false },
            { selector: selectLockoutUntil, value: null },
          ],
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have an invalid form by default', () => {
    expect(component.isFormValid).toBe(false);
  });

  it('should become valid with valid email and password', () => {
    component.loginForm.patchValue({ email: 'test@example.com', password: 'pass' });
    expect(component.isFormValid).toBe(true);
  });

  it('should remain invalid with invalid email format', () => {
    component.loginForm.patchValue({ email: 'notanemail', password: 'pass' });
    expect(component.isFormValid).toBe(false);
  });

  it('should remain invalid with empty password', () => {
    component.loginForm.patchValue({ email: 'test@example.com', password: '' });
    expect(component.isFormValid).toBe(false);
  });

  it('should dispatch login action on submit with valid form', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.loginForm.patchValue({ email: ' test@example.com ', password: 'mypassword' });
    component.onSubmit();

    expect(dispatchSpy).toHaveBeenCalledWith(
      AuthActions.login({ email: 'test@example.com', password: 'mypassword' })
    );
  });

  it('should not dispatch login action with invalid form', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.loginForm.patchValue({ email: 'invalid', password: '' });
    component.onSubmit();

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should disable submit button when loading', () => {
    store.overrideSelector(selectLoginLoading, true);
    store.refreshState();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
  });

  it('should display error message when loginError is set', () => {
    store.overrideSelector(selectLoginError, 'The email or password is incorrect.');
    store.refreshState();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.login-error');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('The email or password is incorrect.');
  });

  it('should display lockout message when locked out', () => {
    store.overrideSelector(selectIsLockedOut, true);
    store.overrideSelector(selectLockoutUntil, Date.now() + 45000);
    store.refreshState();
    fixture.detectChanges();

    const lockoutEl = fixture.nativeElement.querySelector('.lockout-message');
    expect(lockoutEl).toBeTruthy();
    expect(lockoutEl.textContent).toContain('Too many login attempts');
  });

  it('should disable submit button when locked out', () => {
    store.overrideSelector(selectIsLockedOut, true);
    store.overrideSelector(selectLockoutUntil, Date.now() + 30000);
    store.refreshState();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
  });

  it('should show loading spinner when loginLoading is true', () => {
    store.overrideSelector(selectLoginLoading, true);
    store.refreshState();
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.spinner');
    expect(spinner).toBeTruthy();
  });

  it('should have a link to register page', () => {
    const link = fixture.nativeElement.querySelector('a[href="/auth/register"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Register here');
  });
});
