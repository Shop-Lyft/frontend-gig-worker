/* eslint-disable no-undef */
/**
 * Firebase Messaging Service Worker
 *
 * Handles background push notifications and notification click events.
 * When a user taps a notification, it communicates the job ID back to the app
 * so the Jobs page can highlight the relevant job card.
 *
 * Requirements: 13.2, 13.3
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCjAPhM100zz7_5RuUarBa1eklrjuC9ckw',
  authDomain: 'shoplift-6e55f.firebaseapp.com',
  projectId: 'shoplift-6e55f',
  storageBucket: 'shoplift-6e55f.firebasestorage.app',
  messagingSenderId: '693745567301',
  appId: '1:693745567301:web:dc28480d643c08eaa4c52c',
});

const messaging = firebase.messaging();

/**
 * Handle background messages — display a notification with job data.
 */
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notificationTitle = payload.notification?.title || `New ${data.jobType || ''} job available`;
  const notificationBody =
    payload.notification?.body ||
    (data.storeName
      ? `${data.storeName} - Estimated pay: R${Number(data.estimatedPay || 0).toFixed(2)}`
      : 'Tap to view details');

  const notificationOptions = {
    body: notificationBody,
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    data: {
      jobId: data.jobId || '',
      url: `/jobs?highlightJobId=${data.jobId || ''}`,
    },
    tag: data.jobId || 'new-job',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Handle notification click — focus or open the app and navigate to the job.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const jobId = event.notification.data?.jobId || '';
  const targetUrl = `/jobs${jobId ? `?highlightJobId=${jobId}` : ''}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it and post the notification tap message
      for (const client of clientList) {
        if (client.url.includes('/jobs') || client.url.includes('/active') || client.url.includes('/earnings') || client.url.includes('/profile')) {
          client.postMessage({
            type: 'NOTIFICATION_TAP',
            jobId: jobId,
          });
          return client.focus();
        }
      }
      // Otherwise, open a new window
      return clients.openWindow(targetUrl);
    })
  );
});
