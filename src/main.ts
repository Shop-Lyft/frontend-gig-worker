import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Register Firebase Messaging service worker for background push notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((err) => {
    console.warn('Firebase Messaging SW registration failed:', err);
  });
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => {
    console.error(err);

    const isConfigError = err instanceof Error && err.message.includes('BACKEND_MODE');
    const appRoot = document.querySelector('app-root');

    if (appRoot) {
      appRoot.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #0f172a;
          padding: 24px;
          box-sizing: border-box;
        ">
          <div style="
            background: #1e293b;
            border: 1px solid #ef4444;
            border-radius: 12px;
            padding: 32px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            font-family: 'Inter', sans-serif;
          ">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h1 style="color: #ef4444; font-size: 20px; margin: 0 0 12px 0;">Configuration Error</h1>
            <p style="color: #ffffff; font-size: 14px; margin: 0 0 8px 0;">
              ${isConfigError
                ? "Invalid BACKEND_MODE. Expected 'firebase' or 'golang'."
                : 'The application failed to start.'}
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              ${isConfigError
                ? 'Please check the environment configuration and restart the application.'
                : err?.message || 'An unexpected error occurred during bootstrap.'}
            </p>
          </div>
        </div>
      `;
    }
  });
