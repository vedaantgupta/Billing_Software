import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles, RefreshCw, Smartphone } from 'lucide-react';
import { usePwa } from '@/utils/pwaManager';
import '@/components/pwa/PwaInstallPrompt.css';

export const PwaInstallPrompt = () => {
  const { isInstallable, isInstalled, hasUpdate, promptInstall, updateApp } = usePwa();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed banner within last 7 days
    const dismissedAt = localStorage.getItem('bb_pwa_install_dismissed');
    if (dismissedAt) {
      const days = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < 7) {
        setIsDismissed(true);
      }
    }

    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('bb_pwa_install_dismissed', Date.now().toString());
  };

  const handleInstallClick = async () => {
    const res = await promptInstall();
    if (res.outcome === 'accepted') {
      setIsDismissed(true);
    }
  };

  return (
    <>
      {/* 1. New Version Update Toast */}
      {hasUpdate && (
        <div className="pwa-update-toast">
          <RefreshCw size={18} className="animate-spin text-indigo-400" />
          <span>New version available!</span>
          <button className="pwa-update-btn" onClick={updateApp}>
            Update Now
          </button>
        </div>
      )}

      {/* 2. Mobile Floating Install Banner */}
      {isInstallable && !isInstalled && !isDismissed && isMobile && (
        <aside className="pwa-mobile-banner" aria-label="Install BaniyaBook Application">
          <div className="pwa-banner-left">
            <img 
              src="/icons/icon-192.svg" 
              alt="BaniyaBook App" 
              className="pwa-banner-icon" 
            />
            <div className="pwa-banner-info">
              <h4 className="pwa-banner-title">
                Install BaniyaBook <Sparkles size={14} color="#a78bfa" />
              </h4>
              <p className="pwa-banner-desc">Offline billing • Instant desktop & mobile app</p>
            </div>
          </div>

          <div className="pwa-banner-actions">
            <button 
              className="pwa-install-btn-primary" 
              onClick={handleInstallClick}
              aria-label="Install Application"
            >
              <Download size={14} /> Install
            </button>
            <button 
              className="pwa-banner-dismiss" 
              onClick={handleDismiss} 
              aria-label="Dismiss banner"
              title="Dismiss for 7 days"
            >
              <X size={15} />
            </button>
          </div>
        </aside>
      )}
    </>
  );
};

export default PwaInstallPrompt;
