import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, Share2, Sparkles, Check, Store, ShieldCheck, Phone, MapPin, Eye } from 'lucide-react';

const QRStandeeModal = ({ isOpen, onClose, storeConfig, storeUrl }) => {
  const printRef = useRef(null);
  const [standeeTheme, setStandeeTheme] = useState('dark');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const themes = {
    dark: {
      bg: 'linear-gradient(145deg, #090d16 0%, #111827 50%, #1e293b 100%)',
      accent: '#06b6d4',
      cardBg: '#ffffff',
      text: '#ffffff',
      subText: '#94a3b8',
      qrColor: '#0f172a'
    },
    royal: {
      bg: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
      accent: '#a855f7',
      cardBg: '#ffffff',
      text: '#ffffff',
      subText: '#c7d2fe',
      qrColor: '#1e1b4b'
    },
    emerald: {
      bg: 'linear-gradient(145deg, #064e3b 0%, #065f46 50%, #047857 100%)',
      accent: '#34d399',
      cardBg: '#ffffff',
      text: '#ffffff',
      subText: '#a7f3d0',
      qrColor: '#064e3b'
    },
    minimal: {
      bg: '#ffffff',
      accent: '#0284c7',
      cardBg: '#f8fafc',
      text: '#0f172a',
      subText: '#64748b',
      qrColor: '#000000',
      border: '2px solid #e2e8f0'
    }
  };

  const active = themes[standeeTheme] || themes.dark;

  const handleDownloadImage = () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 800;
      canvas.height = 1100;

      // Draw background
      if (standeeTheme === 'dark') {
        const grad = ctx.createLinearGradient(0, 0, 800, 1100);
        grad.addColorStop(0, '#090d16');
        grad.addColorStop(0.5, '#111827');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
      } else if (standeeTheme === 'royal') {
        const grad = ctx.createLinearGradient(0, 0, 800, 1100);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.5, '#312e81');
        grad.addColorStop(1, '#4338ca');
        ctx.fillStyle = grad;
      } else if (standeeTheme === 'emerald') {
        const grad = ctx.createLinearGradient(0, 0, 800, 1100);
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(0.5, '#065f46');
        grad.addColorStop(1, '#047857');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillRect(0, 0, 800, 1100);

      // Border for minimal
      if (standeeTheme === 'minimal') {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 12;
        ctx.strokeRect(10, 10, 780, 1080);
      }

      // Badge
      ctx.fillStyle = active.accent;
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⭐ OFFICIAL DIGITAL STOREFRONT & CATALOG', 400, 110);

      // Store Title
      ctx.fillStyle = active.text;
      ctx.font = '900 44px Inter, sans-serif';
      const storeName = storeConfig?.storeName || 'My Business Store';
      ctx.fillText(storeName, 400, 185);

      // Tagline
      ctx.fillStyle = active.subText;
      ctx.font = '500 22px Inter, sans-serif';
      const tagline = storeConfig?.tagline || 'Scan to view live stock & order on WhatsApp';
      ctx.fillText(tagline.slice(0, 52), 400, 235);

      // White Platter for QR Code
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(175, 290, 450, 480, 28);
      ctx.fill();

      // Convert SVG QR to Image on Canvas
      const svg = printRef.current?.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new window.Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        img.onload = () => {
          ctx.drawImage(img, 220, 325, 360, 360);

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 22px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡ SCAN WITH PHONE CAMERA TO ORDER', 400, 725);

          // URL Box
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.roundRect(140, 815, 520, 60, 14);
          ctx.fill();

          ctx.fillStyle = active.accent;
          ctx.font = 'bold 22px monospace';
          ctx.fillText(storeUrl, 400, 853);

          // Footer
          ctx.fillStyle = active.subText;
          ctx.font = '600 20px Inter, sans-serif';
          const footerStr = [storeConfig?.phone ? `📞 ${storeConfig.phone}` : '', storeConfig?.city ? `📍 ${storeConfig.city}` : ''].filter(Boolean).join('   •   ');
          ctx.fillText(footerStr || 'GST Compliant Commercial Storefront', 400, 940);

          // Download Trigger
          const a = document.createElement('a');
          a.download = `${storeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_qr_standee.png`;
          a.href = canvas.toDataURL('image/png');
          a.click();
          setDownloading(false);
        };
      } else {
        setDownloading(false);
      }
    } catch (err) {
      console.error('Download error:', err);
      setDownloading(false);
    }
  };

  return (
    <>
      {/* PRINT ISOLATION STYLES */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .qr-modal-overlay,
          .qr-modal-overlay * {
            visibility: visible !important;
          }
          .qr-modal-overlay {
            position: absolute !important;
            inset: 0 !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .qr-modal-card {
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .qr-modal-header,
          .qr-theme-selectors,
          .qr-modal-actions {
            display: none !important;
          }
          .printable-standee-container {
            width: 100% !important;
            max-width: 600px !important;
            margin: 2rem auto !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="qr-modal-overlay" style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        overflowY: 'auto'
      }}>
        <div className="qr-modal-card" style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '620px',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}>
          {/* Header Controls */}
          <div className="qr-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Store size={22} color="#0284c7" /> Counter QR Standee Studio
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Print or download this professional QR standee for your cash counter, showroom table, or WhatsApp status.
              </p>
            </div>
            <button 
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Theme Selectors */}
          <div className="qr-theme-selectors" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Theme Style:</span>
            {Object.keys(themes).map(key => (
              <button
                key={key}
                onClick={() => setStandeeTheme(key)}
                style={{
                  background: standeeTheme === key ? '#e0f2fe' : '#f8fafc',
                  border: standeeTheme === key ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  color: standeeTheme === key ? '#0284c7' : '#475569',
                  cursor: 'pointer'
                }}
              >
                {key === 'dark' && '🌑 Cyber Dark'}
                {key === 'royal' && '👑 Royal Indigo'}
                {key === 'emerald' && '🌲 Emerald Green'}
                {key === 'minimal' && '⚪ Minimalist Clean'}
              </button>
            ))}
          </div>

          {/* PRINTABLE STANDEE FRAME */}
          <div 
            ref={printRef}
            className="printable-standee-container"
            style={{
              background: active.bg,
              border: active.border || 'none',
              borderRadius: '20px',
              padding: '2.25rem 1.75rem',
              textAlign: 'center',
              color: active.text,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Header Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
              color: active.accent
            }}>
              <ShieldCheck size={14} /> Official Digital Catalog & Store
            </div>

            {/* Store Name & Tagline */}
            <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {storeConfig?.storeName || 'My Business Store'}
            </h2>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: active.subText, maxWidth: '420px' }}>
              {storeConfig?.tagline || 'Browse our complete catalog, live prices & order on WhatsApp'}
            </p>

            {/* QR Code White Platter */}
            <div style={{
              background: '#ffffff',
              padding: '1.25rem',
              borderRadius: '20px',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.3)',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <QRCodeSVG
                value={storeUrl}
                size={190}
                level="H"
                includeMargin={true}
                fgColor={active.qrColor}
              />
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <Sparkles size={14} color="#0284c7" /> SCAN TO VIEW & ORDER
              </div>
            </div>

            {/* Store URL Badge */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '0.45rem 1rem',
              borderRadius: '10px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: active.accent,
              marginBottom: '1rem',
              maxWidth: '90%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {storeUrl}
            </div>

            {/* Footer Details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8rem', color: active.subText, flexWrap: 'wrap', justifyContent: 'center' }}>
              {storeConfig?.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={13} /> {storeConfig.phone}
                </span>
              )}
              {storeConfig?.city && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={13} /> {storeConfig.city}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheck size={13} /> 100% GST Tax Invoices
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="qr-modal-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handlePrint}
              style={{
                flex: '1 1 180px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(2, 132, 199, 0.3)'
              }}
            >
              <Printer size={18} /> Print Counter Standee
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              style={{
                flex: '1 1 180px',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Download size={18} /> {downloading ? 'Preparing Image...' : 'Download Standee (PNG)'}
            </button>

            <button
              onClick={handleCopyLink}
              style={{
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '0.75rem 1.15rem',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              {copied ? <Check size={18} color="#10b981" /> : <Share2 size={18} />}
              {copied ? 'Copied Link!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default QRStandeeModal;
