import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const AUTH_TOKEN_KEY = 'gig_auth_token';

/**
 * Functional HTTP interceptor that:
 * 1. Attaches the JWT Bearer token to outgoing requests.
 * 2. Handles 401 responses by clearing auth state and redirecting to login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  // Clone request with Authorization header if token exists
  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Clear auth token from localStorage
        localStorage.removeItem(AUTH_TOKEN_KEY);

        // Redirect to login
        router.navigateByUrl('/auth/login');
      }

      return throwError(() => error);
    })
  );
};
