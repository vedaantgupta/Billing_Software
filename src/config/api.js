// Centralized API and Backend Configuration
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

export const BACKEND_URL = (
  (isLocalhost ? 'http://localhost:5000' : null) ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD 
    ? 'https://billing-software-backend-nzi8.onrender.com' 
    : 'http://localhost:5000')
).replace(/\/+$/, '');

export const API_BASE_URL = `${BACKEND_URL}/api`;
export const SOCKET_URL = BACKEND_URL;

/**
 * Normalizes image or file URLs returned from the backend or database.
 * If the URL contains an old localhost:5000 domain, rewrites it to the active BACKEND_URL.
 */
export const getUploadUrl = (urlOrPath) => {
  if (!urlOrPath) return '';
  if (typeof urlOrPath !== 'string') return urlOrPath;
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath.replace(/^http:\/\/(localhost|127\.0\.0\.1):5000/, BACKEND_URL);
  }
  const cleanPath = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
  return `${BACKEND_URL}${cleanPath}`;
};

export default {
  BACKEND_URL,
  API_BASE_URL,
  SOCKET_URL,
  getUploadUrl,
};
