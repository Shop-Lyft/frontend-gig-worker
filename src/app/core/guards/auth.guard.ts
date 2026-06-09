import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectIsAuthenticated } from '../../store/auth/auth.selectors';
import { take } from 'rxjs/operators';

/**
 * Functional auth guard that waits for session restoration before checking auth state.
 * On page refresh, the AppComponent restores the session from localStorage into the NgRx store.
 * This guard waits briefly for that to happen before deciding to redirect.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const store = inject(Store);

  const token = localStorage.getItem('gig_auth_token');

  // If no token in localStorage, definitely not authenticated
  if (!token) {
    return router.createUrlTree(['/auth/login']);
  }

  // Token exists in localStorage — wait for the NgRx store to be hydrated
  // The AppComponent dispatches restoreSession on init, so we wait briefly
  return new Promise<boolean>((resolve) => {
    // Check store immediately
    const sub = store.select(selectIsAuthenticated).pipe(take(1)).subscribe((isAuth) => {
      if (isAuth) {
        resolve(true);
      } else {
        // Store not yet hydrated — wait up to 3 seconds for restoreSession
        const interval = setInterval(() => {
          const currentToken = localStorage.getItem('gig_auth_token');
          if (!currentToken) {
            clearInterval(interval);
            router.navigate(['/auth/login']);
            resolve(false);
          }
        }, 100);

        // Give the app time to restore session
        setTimeout(() => {
          clearInterval(interval);
          const currentToken = localStorage.getItem('gig_auth_token');
          if (currentToken) {
            resolve(true);
          } else {
            router.navigate(['/auth/login']);
            resolve(false);
          }
        }, 2000);
      }
    });
  });
};
