import { ApplicationConfig, isDevMode, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { GIG_WORKER_SERVICE } from './core/services/gig-worker.service';
import { GigWorkerFirebaseService } from './core/services/gig-worker-firebase.service';
import { GigWorkerRestService } from './core/services/gig-worker-rest.service';
import { earningsReducer } from './store/earnings/earnings.reducer';
import { EarningsEffects } from './store/earnings/earnings.effects';
import { profileReducer } from './store/profile/profile.reducer';
import { ProfileEffects } from './store/profile/profile.effects';
import { AUTH_FEATURE_KEY, authReducer } from './store/auth/auth.reducer';
import * as authEffects from './store/auth/auth.effects';
import { jobsReducer } from './store/jobs/jobs.reducer';
import * as jobsEffects from './store/jobs/jobs.effects';
import { activeJobReducer } from './store/active-job/active-job.reducer';
import { ActiveJobEffects } from './store/active-job/active-job.effects';
import * as appEffects from './store/app.effects';

if (environment.BACKEND_MODE !== 'firebase' && environment.BACKEND_MODE !== 'golang') {
  throw new Error(
    `Invalid BACKEND_MODE: "${environment.BACKEND_MODE}". Must be "firebase" or "golang".`
  );
}

/**
 * Factory that sets Firebase Auth persistence to local (indexedDB/localStorage)
 * so tokens survive browser refreshes.
 * Requirement 1.6: Session persistence across browser refreshes.
 */
function initializeFirebasePersistence(): () => Promise<void> {
  return async () => {
    if (environment.BACKEND_MODE === 'firebase') {
      const { initializeApp: fbInit } = await import('firebase/app');
      const { getAuth: fbGetAuth, browserLocalPersistence: fbLocalPersistence, setPersistence: fbSetPersistence } = await import('firebase/auth');
      const app = fbInit(environment.firebase);
      const auth = fbGetAuth(app);
      await fbSetPersistence(auth, fbLocalPersistence);
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideStore({
      [AUTH_FEATURE_KEY]: authReducer,
      jobs: jobsReducer,
      'active-job': activeJobReducer,
      earnings: earningsReducer,
      profile: profileReducer,
    }),
    provideEffects(authEffects, jobsEffects, ActiveJobEffects, EarningsEffects, ProfileEffects, appEffects),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
    }),
    {
      provide: GIG_WORKER_SERVICE,
      useClass: environment.BACKEND_MODE === 'firebase'
        ? GigWorkerFirebaseService
        : GigWorkerRestService,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeFirebasePersistence,
      multi: true,
    },
  ],
};
