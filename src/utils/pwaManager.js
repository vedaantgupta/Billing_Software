import { useState, useEffect } from 'react';
import { syncOfflineData } from '@/utils/db';

let deferredInstallPrompt = null;
let pwaListeners = new Set();

const notifyListeners = () => {
  pwaListeners.forEach(fn => fn());
};

/**
 * Register Service Worker with intelligent update detection
 */
export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Prevent duplicate registration in dev hot-reload
  if (window.__PWA_SW_REGISTERED__) return;
  window.__PWA_SW_REGISTERED__ = true;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA Manager] Service Worker registered with scope:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA Manager] New application version available.');
              window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { registration } }));
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[PWA Manager] Service Worker registration failed:', error.message);
      });
  });

  // Capture install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log('[PWA Manager] Install prompt captured and deferred');
    notifyListeners();
    window.dispatchEvent(new CustomEvent('pwa-install-ready'));
  });

  // App successfully installed
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    console.log('[PWA Manager] Application successfully installed as PWA');
    notifyListeners();
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });

  // Online connection restored -> auto-trigger queue sync
  window.addEventListener('online', () => {
    console.log('[PWA Manager] Online restored. Flushing local offline queue...');
    syncOfflineData();
    notifyListeners();
    window.dispatchEvent(new CustomEvent('pwa-connectivity-change', { detail: { isOnline: true } }));
  });

  // Offline network drop
  window.addEventListener('offline', () => {
    console.warn('[PWA Manager] Offline mode activated. Operating via local storage and cache.');
    notifyListeners();
    window.dispatchEvent(new CustomEvent('pwa-connectivity-change', { detail: { isOnline: false } }));
  });
};

/**
 * Trigger native install prompt dialog
 */
export const promptInstall = async () => {
  if (!deferredInstallPrompt) {
    console.log('[PWA Manager] No deferred install prompt available.');
    return { outcome: 'dismissed', reason: 'not-available' };
  }

  try {
    deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    console.log('[PWA Manager] User install choice:', choiceResult.outcome);
    deferredInstallPrompt = null;
    notifyListeners();
    return choiceResult;
  } catch (err) {
    console.error('[PWA Manager] Failed to prompt installation:', err);
    return { outcome: 'error', error: err.message };
  }
};

/**
 * Check if app is running as standalone PWA
 */
export const isStandaloneApp = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true
  );
};

/**
 * Check count of pending offline documents in localStorage
 */
export const getOfflineQueueCount = () => {
  if (typeof window === 'undefined') return 0;
  try {
    const queue = JSON.parse(localStorage.getItem('gogstbill_db_queue') || '[]');
    return Array.isArray(queue) ? queue.length : 0;
  } catch (e) {
    return 0;
  }
};

/**
 * Reactive React Hook for PWA state
 */
export const usePwa = () => {
  const [isInstallable, setIsInstallable] = useState(Boolean(deferredInstallPrompt));
  const [isInstalled, setIsInstalled] = useState(isStandaloneApp());
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queueCount, setQueueCount] = useState(getOfflineQueueCount());
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    const updateState = () => {
      setIsInstallable(Boolean(deferredInstallPrompt));
      setIsInstalled(isStandaloneApp());
      setIsOnline(navigator.onLine);
      setQueueCount(getOfflineQueueCount());
    };

    pwaListeners.add(updateState);

    const handleUpdate = () => setHasUpdate(true);
    const handleConnectivity = () => {
      updateState();
    };

    window.addEventListener('pwa-update-available', handleUpdate);
    window.addEventListener('pwa-connectivity-change', handleConnectivity);
    window.addEventListener('storage', updateState);

    return () => {
      pwaListeners.delete(updateState);
      window.removeEventListener('pwa-update-available', handleUpdate);
      window.removeEventListener('pwa-connectivity-change', handleConnectivity);
      window.removeEventListener('storage', updateState);
    };
  }, []);

  const updateApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
  };

  return {
    isInstallable,
    isInstalled,
    isOnline,
    queueCount,
    hasUpdate,
    promptInstall,
    updateApp
  };
};
