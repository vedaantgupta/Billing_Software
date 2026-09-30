import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/styles/universal.css'
import '@/index.css'
import 'leaflet/dist/leaflet.css';
import { registerServiceWorker } from '@/utils/pwaManager';

// Initialize PWA Service Worker & Offline Sync Engine
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

