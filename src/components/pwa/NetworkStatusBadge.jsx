import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { usePwa } from '@/utils/pwaManager';
import { syncOfflineData } from '@/utils/db';
import '@/components/pwa/PwaInstallPrompt.css';

export const NetworkStatusBadge = () => {
  const { isOnline, queueCount } = usePwa();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      await syncOfflineData();
    } finally {
      setIsSyncing(false);
    }
  };

  // If online and zero pending queue items, render a very clean status indicator
  if (isOnline && queueCount === 0) {
    return (
      <div 
        className="pwa-network-badge online hide-on-mobile" 
        title="Connected to cloud server • Real-time database sync"
      >
        <span className="pwa-dot" />
        <span>Live</span>
      </div>
    );
  }

  // If online with pending sync items
  if (isOnline && queueCount > 0) {
    return (
      <button 
        className="pwa-network-badge syncing" 
        onClick={handleManualSync}
        title={`Click to sync ${queueCount} local records to cloud server`}
        style={{ cursor: 'pointer' }}
      >
        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
        <span>Sync ({queueCount})</span>
      </button>
    );
  }

  // If offline
  return (
    <div 
      className="pwa-network-badge offline" 
      title="Operating offline • All invoices & data stored in local storage and will auto-sync when online"
    >
      <WifiOff size={12} />
      <span>Offline {queueCount > 0 ? `(${queueCount})` : ''}</span>
    </div>
  );
};

export default NetworkStatusBadge;
