import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register service worker safely in browser
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('New TRUSTLY PWA version available');
      },
      onOfflineReady() {
        console.log('TRUSTLY PWA ready for offline use');
      },
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
