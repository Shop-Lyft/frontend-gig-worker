export const environment = {
  production: true,
  BACKEND_MODE: 'firebase' as 'firebase' | 'golang',
  firebase: {
    apiKey: 'AIzaSyCjAPhM100zz7_5RuUarBa1eklrjuC9ckw',
    authDomain: 'shoplift-6e55f.firebaseapp.com',
    projectId: 'shoplift-6e55f',
    storageBucket: 'shoplift-6e55f.firebasestorage.app',
    messagingSenderId: '693745567301',
    appId: '1:693745567301:web:b573dd3fa226ad77a4c52c',
    measurementId: 'G-K2CW9JTTTJ',
  },
  apiBaseUrl: '/api/v1',
  wsUrl: '/ws/worker',
};
