import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Functional auth guard that redirects unauthenticated users to /auth/login.
 * Checks for the presence of a JWT token in localStorage under 'gig_auth_token'.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  const token = localStorage.getItem('gig_auth_token');

  if (token) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
