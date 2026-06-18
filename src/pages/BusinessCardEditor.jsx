/* BusinessCardEditor.jsx - Premium Double-Sided Card Builder */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, Save, Download, Phone, Mail, Globe, MapPin,
  RotateCw, Layout, Palette, Type, Upload, Trash2,
  Sparkles, Check, RefreshCw, Briefcase, Plus, Image as ImageIcon,
  CheckSquare, ArrowRight, Printer, Info
} from 'lucide-react';

import html2pdf from 'html2pdf.js';
import Cropper from 'react-easy-crop';
import { getItems, addItem, updateItem, getDB } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './BusinessCardEditor.css';

// Predefined Logo vectors
const PREDEFINED_LOGOS = [
  // Tech Infinity
  {
    name: 'Tech Infinity',
    svg: (color) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
        <path d="M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
      </svg>
    )
  },
  // Hexagon Finance
  {
    name: 'Hexa Finance',
    svg: (color) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    )
  },
  // Luxury Diamond
  {
    name: 'Luxury Diamond',
    svg: (color) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21 16-9 5-9-5V8l9-5 9 5v8z" />
        <path d="M12 21V3M3 8h18M3 16h18" />
      </svg>
    )
  },
  // Abstract Wave
  {
    name: 'Abstract Flow',
    svg: (color) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0z" />
        <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" />
      </svg>
    )
  },
  // Delta Triangle
  {
    name: 'Delta Growth',
    svg: (color) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 22h20L12 2zm0 4l7.5 13.5H4.5L12 6z" />
      </svg>
    )
  },
  // Global Network
  {
    name: 'Globe Core',
    svg: (color) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        <path d="M2 12h20" />
      </svg>
    )
  }
];

// Color Presets
const COLOR_PRESETS = [
  {
    name: 'Luxury Gold',
    primary: '#d4af37',
    text: '#f1f5f9',
    accent: '#f59e0b',
    bg: '#0f172a'
  },
  {
    name: 'Emerald Teal',
    primary: '#10b981',
    text: '#ffffff',
    accent: '#059669',
    bg: '#022c22'
  },
  {
    name: 'Royal Indigo',
    primary: '#6366f1',
    text: '#f8fafc',
    accent: '#e0e7ff',
    bg: '#1e1b4b'
  },
  {
    name: 'Modern Slate',
    primary: '#1e293b',
    text: '#0f172a',
    accent: '#3b82f6',
    bg: '#f8fafc'
  },
  {
    name: 'Crimson Night',
    primary: '#f43f5e',
    text: '#fff1f2',
    accent: '#fda4af',
    bg: '#4c0519'
  },
  {
    name: 'Peach Sunset',
    primary: '#f97316',
    text: '#ffffff',
    accent: '#fde047',
    bg: '#431407'
  }
];

const THEMES = [
  { id: 'luxury', name: 'Dark Luxury', desc: 'Serif font & golden borders', icon: '✨' },
  { id: 'minimal', name: 'Minimalist Light', desc: 'Clean, modern typography', icon: '◽' },
  { id: 'creative', name: 'Creative Agency', desc: 'Geometrical cuts & abstract shapes', icon: '🎨' },
  { id: 'corporate', name: 'Corporate Pro', desc: 'Classic structural layout', icon: '🏢' },
  { id: 'glassmorphism', name: 'Neon Glassmorphism', desc: 'Futuristic frosted-glass style', icon: '🔮' },
  { id: 'modernpro', name: 'Modern Professional', desc: 'Clean, premium design with clear fonts', icon: '💼' }
];

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        resolve(reader.result);
      };
    }, 'image/jpeg', 0.95);
  });
};

export default function BusinessCardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Header and layout state
  const [cardName, setCardName] = useState('My Business Card');
  const [activeTab, setActiveTab] = useState('templates');
  const [theme, setTheme] = useState('luxury');
  const [orientation, setOrientation] = useState('landscape');
  const [borderRadius, setBorderRadius] = useState(12);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Card Content Fields
  const [details, setDetails] = useState({
    companyName: '',
    tagline: '',
    fullName: '',
    designation: '',
    phone: '',
    phone2: '',
    email: '',
    website: '',
    address: '',

    // Dynamic Links
    links: [
      {
        id: 1,
        url: ''
      }
    ],

    // Logo Settings
    logoType: 'auto', // auto | uploaded
    uploadedLogoUrl: '',

    // Background Image Settings
    bgImageFront: '',
    bgImageBack: ''
  });

  // Custom styling settings
  const [customColors, setCustomColors] = useState({
    bg: '#0f172a',
    text: '#ffffff',
    primary: '#d4af37',
    accent: '#f59e0b',
    override: false
  });

  const [fontFamily, setFontFamily] = useState('Montserrat');

  const fileInputRef = useRef(null);
  const bgFileInputRef = useRef(null);

  // Background Image Cropping States
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [cropSide, setCropSide] = useState('front'); // 'front' | 'back'
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleBgSelect = (e, side) => {
    const file = e.target.files[0];
    if (file) {
      setCropSide(side);
      const reader = new FileReader();
      reader.onload = () => {
        setTempImage(reader.result);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleApplyCrop = async () => {
    if (!tempImage || !croppedAreaPixels) return;
    try {
      const croppedBase64 = await getCroppedImg(tempImage, croppedAreaPixels);
      if (croppedBase64) {
        if (cropSide === 'front') {
          handleInputChange('bgImageFront', croppedBase64);
        } else {
          handleInputChange('bgImageBack', croppedBase64);
        }
      }
      setShowCropModal(false);
      setTempImage(null);
      // Reset input value so same file can be uploaded again if needed
      if (bgFileInputRef.current) bgFileInputRef.current.value = '';
    } catch (error) {
      console.error('Failed to crop background image:', error);
      alert('Failed to crop the background image. Please try again.');
    }
  };

  const getCropAspectRatio = () => {
    return orientation === 'landscape' ? 3.5 / 2 : 2 / 3.5;
  };

  // Initialize details from company profile & user context
  useEffect(() => {
    const loadCard = async () => {
      setLoading(true);
      if (id && user?.id) {
        try {
          const items = await getItems('documents', user.id);
          const doc = items.find(d => d.id === id);
          if (doc) {
            setCardName(doc.title || 'My Business Card');
            if (doc.cardConfig) {
              const config = typeof doc.cardConfig === 'string' ? JSON.parse(doc.cardConfig) : doc.cardConfig;
              if (config.theme) setTheme(config.theme);
              if (config.orientation) setOrientation(config.orientation);
              if (config.borderRadius !== undefined) setBorderRadius(config.borderRadius);
              if (config.customColors) setCustomColors(config.customColors);
              if (config.fontFamily) setFontFamily(config.fontFamily);
              if (config.details) setDetails(prev => ({ ...prev, ...config.details }));
            }
          }
        } catch (e) {
          console.error("Failed to load business card:", e);
        }
      } else {
        // Fetch default details from company profile in db
        const company = getDB().company || {};
        setDetails(prev => ({
          ...prev,
          companyName: company.name || 'Acme Corporation',
          tagline: company.industry || 'Consulting & Services',
          fullName: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Jane Doe',
          designation: 'Managing Director',
          phone: company.phone || '+91 98765 43210',
          email: user?.email || 'jane@acme.com',
          website: company.website || 'www.acmecorp.com',
          address: company.address || '123 Business Boulevard, Mumbai, MH, 400001'
        }));
      }
      setLoading(false);
    };

    loadCard();
  }, [id, user]);

  // Apply predefined color presets
  const applyColorPreset = (preset) => {
    setCustomColors({
      bg: preset.bg,
      text: preset.text,
      primary: preset.primary,
      accent: preset.accent,
      override: true
    });
  };

  // Handle Detail Inputs
  const handleInputChange = (field, val) => {
    setDetails(prev => ({ ...prev, [field]: val }));
  };

  // Image Upload handler
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDetails(prev => ({
          ...prev,
          logoType: 'uploaded',
          uploadedLogoUrl: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Dynamic Links System

  const getPlatformInfo = (url = '') => {
    const lower = url.toLowerCase();

    if (lower.includes('youtube')) {
      return {
        label: 'YouTube',
        color: '#FF0000',
        icon: '▶'
      };
    }

    if (lower.includes('facebook')) {
      return {
        label: 'Facebook',
        color: '#1877F2',
        icon: 'f'
      };
    }

    if (lower.includes('instagram')) {
      return {
        label: 'Instagram',
        color: '#E1306C',
        icon: '📷'
      };
    }

    if (lower.includes('linkedin')) {
      return {
        label: 'LinkedIn',
        color: '#0A66C2',
        icon: 'in'
      };
    }

    if (
      lower.includes('twitter') ||
      lower.includes('x.com')
    ) {
      return {
        label: 'X',
        color: '#000000',
        icon: '𝕏'
      };
    }

    if (
      lower.includes('whatsapp') ||
      lower.includes('wa.me')
    ) {
      return {
        label: 'WhatsApp',
        color: '#25D366',
        icon: '💬'
      };
    }

    if (lower.includes('github')) {
      return {
        label: 'GitHub',
        color: '#24292F',
        icon: '⌘'
      };
    }

    return {
      label: 'Website',
      color: '#64748b',
      icon: '🌐'
    };
  };

  const addLink = () => {
    setDetails(prev => ({
      ...prev,
      links: [
        ...(prev.links || []),
        {
          id: Date.now(),
          url: ''
        }
      ]
    }));
  };

  const removeLink = (id) => {
    setDetails(prev => ({
      ...prev,
      links: (prev.links || []).filter(
        link => link.id !== id
      )
    }));
  };

  const updateLink = (id, value) => {
    setDetails(prev => ({
      ...prev,
      links: (prev.links || []).map(link =>
        link.id === id
          ? { ...link, url: value }
          : link
      )
    }));
  };

  const renderSocialIcons = (
    size = 28,
    isClickable = true
  ) => {
    const links = details.links || [];

    const activeLinks = links.filter(
      link => link.url && link.url.trim()
    );

    if (!activeLinks.length) return null;

    return (
      <div className="cb-social-strip">
        <span className="cb-social-label">
          also on
        </span>

        <div className="cb-social-icons-row">
          {activeLinks.map(link => {
            const platform =
              getPlatformInfo(link.url);

            const finalUrl =
              link.url.startsWith('http')
                ? link.url
                : `https://${link.url}`;

            return (
              <div
                key={link.id}
                className="cb-social-icon-btn"
                style={{
                  background: platform.color,
                  width: `${size}px`,
                  height: `${size}px`,
                  borderRadius: '50%',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: `${size * 0.45}px`,
                  fontWeight: 700,
                  cursor: isClickable
                    ? 'pointer'
                    : 'default',
                  flexShrink: 0,
                  boxShadow:
                    '0 2px 8px rgba(0,0,0,0.25)'
                }}
                title={platform.label}
                onClick={
                  isClickable
                    ? () =>
                      window.open(
                        finalUrl,
                        '_blank',
                        'noopener'
                      )
                    : undefined
                }
              >
                {platform.icon}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Save Card to DB
  const handleSave = async () => {
    if (!user?.id) {
      alert('You must be logged in to save.');
      return;
    }
    setIsSaving(true);

    const docData = {
      docType: 'Business Card',
      title: cardName,
      cardConfig: {
        theme,
        orientation,
        borderRadius,
        customColors,
        fontFamily,
        details
      },
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: `BC-${Date.now().toString().slice(-4)}`,
      total: 0,
      updatedAt: new Date().toISOString()
    };

    try {
      if (id) {
        await updateItem('documents', id, docData, user.id);
        alert('Business Card updated successfully!');
      } else {
        await addItem('documents', { ...docData, createdAt: new Date().toISOString() }, user.id);
        alert('Business Card saved successfully!');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save card design.');
    } finally {
      setIsSaving(false);
    }
  };

  // Export PDF with html2pdf
  const handleExportPDF = () => {
    const element = document.getElementById('business-card-print-area');
    if (!element) return;

    // Temporarily make it visible for html2pdf rendering
    element.style.position = 'relative';
    element.style.left = '0';
    element.style.top = '0';
    element.style.display = 'block';

    const opt = {
      margin: 10,
      filename: `${cardName.replace(/\s+/g, '_')}_visiting_card.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save().then(() => {
      // Put it back off-screen
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '-9999px';
      element.style.display = 'none';
    }).catch(err => {
      console.error(err);
      // Restore styles in case of error
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '-9999px';
      element.style.display = 'none';
    });
  };

  // Trigger Print dialog
  const handlePrint = () => {
    window.print();
  };

  // Pick colors based on selected theme & custom override
  const getColors = () => {
    if (customColors.override) {
      return customColors;
    }
    switch (theme) {
      case 'luxury':
        return { bg: '#111827', text: '#f1f5f9', primary: '#d4af37', accent: '#f59e0b' };
      case 'minimal':
        return { bg: '#ffffff', text: '#1e293b', primary: '#0f172a', accent: '#3b82f6' };
      case 'creative':
        return { bg: '#0f172a', text: '#ffffff', primary: '#8b5cf6', accent: '#ff6b6b' };
      case 'corporate':
        return { bg: '#f8fafc', text: '#0f172a', primary: '#1e40af', accent: '#64748b' };
      case 'glassmorphism':
        return { bg: 'rgba(255, 255, 255, 0.04)', text: '#ffffff', primary: '#ffffff', accent: '#f59e0b' };
      case 'modernpro':
        return { bg: '#f5f5f5', text: '#111827', primary: '#0d6efd', accent: '#ff6b6b' };
      default:
        return { bg: '#ffffff', text: '#1e293b', primary: '#0f172a', accent: '#3b82f6' };
    }
  };

  const colors = getColors();

  // Render vector predefined logo
  const renderLogo = (color, size = 28) => {
    if (details.logoType === 'uploaded' && details.uploadedLogoUrl) {
      return (
        <img
          src={details.uploadedLogoUrl}
          alt="Company Logo"
          style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain', borderRadius: '4px' }}
        />
      );
    }
    const preset = PREDEFINED_LOGOS[details.predefinedLogoIdx] || PREDEFINED_LOGOS[0];
    return preset.svg(color);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0b0f19', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: '#f59e0b', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600 }}>Loading Premium Card Builder...</p>
        </div>
      </div>
    );
  }

  // Common card style object
  const cardStyle = {
    fontFamily: fontFamily,
    borderRadius: `${borderRadius}px`,
    backgroundColor: theme === 'glassmorphism' ? 'rgba(255, 255, 255, 0.03)' : colors.bg,
    color: colors.text,
    borderColor: theme === 'luxury' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.08)'
  };

  const frontCardStyle = {
    ...cardStyle,
    backgroundImage: details.bgImageFront ? `url(${details.bgImageFront})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };

  const backCardStyle = {
    ...cardStyle,
    backgroundImage: details.bgImageBack ? `url(${details.bgImageBack})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };

  return (
    <div className="card-builder-container">
      {/* Editor Header */}
      <header className="card-builder-header">
        <div className="cb-header-left">
          <button className="cb-back-btn" onClick={() => navigate('/editor')}>
            <ChevronLeft size={16} /> Back to Hub
          </button>
          <div className="cb-title-wrapper">
            <Sparkles className="cb-title-icon" size={20} />
            <input
              type="text"
              className="cb-title-input"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Name your design..."
            />
          </div>
        </div>
        <div className="cb-header-right">
          <button className="cb-btn cb-btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> Print Cards
          </button>
          <button className="cb-btn cb-btn-secondary" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
          <button className="cb-btn cb-btn-primary" onClick={handleSave} disabled={isSaving}>
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Design'}
          </button>
        </div>
      </header>

      {/* Editor workspace */}
      <div className="card-builder-workspace">
        {/* Settings Sidebar */}
        <aside className="card-builder-sidebar">
          {/* Tabs header */}
          <div className="cb-sidebar-tabs">
            <button className={`cb-tab-btn ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>
              <Layout size={18} />
              <span>Templates</span>
            </button>
            <button className={`cb-tab-btn ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>
              <Briefcase size={18} />
              <span>Details</span>
            </button>
            <button className={`cb-tab-btn ${activeTab === 'design' ? 'active' : ''}`} onClick={() => setActiveTab('design')}>
              <Palette size={18} />
              <span>Branding</span>
            </button>
            <button className={`cb-tab-btn ${activeTab === 'layout' ? 'active' : ''}`} onClick={() => setActiveTab('layout')}>
              <Layout size={18} />
              <span>Layout</span>
            </button>
          </div>

          {/* Sidebar scrollable contents */}
          <div className="cb-sidebar-content">

            {/* TEMPLATE SELECTION TAB */}
            {activeTab === 'templates' && (
              <div className="cb-tab-panel">
                <div className="cb-section-title">
                  <Layout size={16} className="cb-title-icon" /> Select Card Preset
                </div>
                <div className="cb-templates-grid">
                  {THEMES.map((t) => (
                    <div
                      key={t.id}
                      className={`cb-template-card ${theme === t.id ? 'active' : ''}`}
                      onClick={() => {
                        setTheme(t.id);
                        setCustomColors(prev => ({ ...prev, override: false })); // reset override
                      }}
                    >
                      <div className="cb-template-thumb" style={{
                        background: t.id === 'luxury' ? 'linear-gradient(135deg, #111827, #1f2937)' :
                          t.id === 'minimal' ? '#f8fafc' :
                            t.id === 'creative' ? 'linear-gradient(135deg, #4c1d95, #7c2d12)' :
                              t.id === 'corporate' ? '#e2e8f0' :
                                t.id === 'modernpro' ? 'linear-gradient(135deg, #0d6efd, #ff6b6b)' :
                                  'rgba(255, 255, 255, 0.05)',
                        border: t.id === 'luxury' ? '1px solid #d4af37' :
                                t.id === 'modernpro' ? '1px solid #0d6efd' :
                                '1px solid #e2e8f0',
                        color: t.id === 'minimal' ? '#0f172a' : '#fff'
                      }}>
                        {t.icon}
                      </div>
                      <div className="cb-template-info">
                        <h4>{t.name}</h4>
                        <p>{t.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* OR Custom Card Background Separator & Controls */}
                <div style={{ margin: '1.75rem 0 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ height: '1px', flex: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
                  <span style={{ height: '1px', flex: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
                </div>

                <div className="cb-section-title" style={{ marginTop: '1rem' }}>
                  <ImageIcon size={16} className="cb-title-icon" /> Custom Card Background
                </div>
                <div className="cb-control-group">
                  <label className="cb-label">Upload background images for either side of your card</label>
                  
                  {/* Front Background Upload */}
                  <div style={{ marginBottom: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '0.75rem', background: 'rgba(0, 0, 0, 0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="cb-label" style={{ margin: 0, fontWeight: 600, color: '#e2e8f0' }}>Front Side Background</span>
                      {details.bgImageFront && (
                        <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Active</span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <button
                        className="cb-btn cb-btn-secondary"
                        onClick={() => {
                          setCropSide('front');
                          bgFileInputRef.current.click();
                        }}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        <Upload size={12} /> {details.bgImageFront ? 'Change Image' : 'Upload Image'}
                      </button>
                      
                      {details.bgImageFront && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                          <img src={details.bgImageFront} alt="Front bg thumb" style={{ width: '45px', height: '26px', objectFit: 'cover', border: '1px solid #334155', borderRadius: '4px' }} />
                          <button
                            className="cb-quick-btn"
                            onClick={() => {
                              setTempImage(details.bgImageFront);
                              setCropSide('front');
                              setCrop({ x: 0, y: 0 });
                              setZoom(1);
                              setShowCropModal(true);
                            }}
                            title="Recrop"
                            style={{ padding: '4px' }}
                          >
                            <RotateCw size={12} />
                          </button>
                          <button
                            className="doc-action-btn delete"
                            onClick={() => handleInputChange('bgImageFront', '')}
                            style={{ padding: '4px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Back Background Upload */}
                  <div style={{ border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '0.75rem', background: 'rgba(0, 0, 0, 0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="cb-label" style={{ margin: 0, fontWeight: 600, color: '#e2e8f0' }}>Back Side Background</span>
                      {details.bgImageBack && (
                        <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Active</span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <button
                        className="cb-btn cb-btn-secondary"
                        onClick={() => {
                          setCropSide('back');
                          bgFileInputRef.current.click();
                        }}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        <Upload size={12} /> {details.bgImageBack ? 'Change Image' : 'Upload Image'}
                      </button>
                      
                      {details.bgImageBack && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                          <img src={details.bgImageBack} alt="Back bg thumb" style={{ width: '45px', height: '26px', objectFit: 'cover', border: '1px solid #334155', borderRadius: '4px' }} />
                          <button
                            className="cb-quick-btn"
                            onClick={() => {
                              setTempImage(details.bgImageBack);
                              setCropSide('back');
                              setCrop({ x: 0, y: 0 });
                              setZoom(1);
                              setShowCropModal(true);
                            }}
                            title="Recrop"
                            style={{ padding: '4px' }}
                          >
                            <RotateCw size={12} />
                          </button>
                          <button
                            className="doc-action-btn delete"
                            onClick={() => handleInputChange('bgImageBack', '')}
                            style={{ padding: '4px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={bgFileInputRef}
                    onChange={(e) => handleBgSelect(e, cropSide)}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* DETAILS FORM TAB */}
            {activeTab === 'details' && (
              <div className="cb-tab-panel">
                <div className="cb-section-title">
                  <Briefcase size={16} className="cb-title-icon" /> Company Info
                </div>
                <div className="cb-control-group">
                  <label className="cb-label">Company Name</label>
                  <input
                    type="text"
                    className="cb-input"
                    value={details.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    placeholder="Enter company name..."
                  />
                </div>
                <div className="cb-control-group">
                  <label className="cb-label">Industry / Tagline</label>
                  <input
                    type="text"
                    className="cb-input"
                    value={details.tagline}
                    onChange={(e) => handleInputChange('tagline', e.target.value)}
                    placeholder="Enter company tagline..."
                  />
                </div>

                <div className="cb-section-title" style={{ marginTop: '2rem' }}>
                  <Type size={16} className="cb-title-icon" /> Personal Details
                </div>
                <div className="cb-control-group">
                  <label className="cb-label">Full Name</label>
                  <input
                    type="text"
                    className="cb-input"
                    value={details.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder="Enter full name..."
                  />
                </div>
                <div className="cb-control-group">
                  <label className="cb-label">Job Title / Designation</label>
                  <input
                    type="text"
                    className="cb-input"
                    value={details.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    placeholder="Enter designation..."
                  />
                </div>

                <div className="cb-section-title" style={{ marginTop: '2rem' }}>
                  <Phone size={16} className="cb-title-icon" /> Contact Info
                </div>
                <div className="cb-control-group row">
                  <div>
                    <label className="cb-label">Phone 1</label>
                    <input
                      type="text"
                      className="cb-input"
                      value={details.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+91..."
                    />
                  </div>
                  <div>
                    <label className="cb-label">Phone 2 (Optional)</label>
                    <input
                      type="text"
                      className="cb-input"
                      value={details.phone2}
                      onChange={(e) => handleInputChange('phone2', e.target.value)}
                      placeholder="+91..."
                    />
                  </div>
                </div>
                <div className="cb-control-group">
                  <label className="cb-label">Work Email</label>
                  <input
                    type="email"
                    className="cb-input"
                    value={details.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="name@company.com"
                  />
                </div>
                <div className="cb-control-group">
                  <label className="cb-label">Company Website</label>
                  <input
                    type="text"
                    className="cb-input"
                    value={details.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="www.company.com"
                  />
                </div>
                <div className="cb-control-group">
                  <label className="cb-label">Work Address</label>
                  <textarea
                    className="cb-input"
                    rows="2"
                    value={details.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter full address..."
                    style={{ resize: 'none' }}
                  />
                </div>

                <div className="cb-section-title" style={{ marginTop: '2rem' }}>
                  <Globe size={16} className="cb-title-icon" /> Social Media Handles
                </div>
                <p className="cb-label" style={{ opacity: 0.6, fontSize: '0.75rem', marginBottom: '0.75rem' }}>Enter full URLs. Icons appear on card back side.</p>
                {/* SOCIAL MEDIA HANDLES - DYNAMIC MULTI‑LINK UI */}
                {details.links && details.links.map(link => (
                  <div className="cb-control-group row" key={link.id} style={{ marginBottom: '0.6rem', alignItems: 'center' }}>
                    <div style={{ flex: 1, marginRight: '0.5rem' }}>
                      <input
                        type="url"
                        className="cb-input"
                        placeholder="https://..."
                        value={link.url}
                        onChange={(e) => updateLink(link.id, e.target.value)}
                      />
                    </div>
                    <button
                      className="cb-btn cb-btn-secondary"
                      onClick={() => removeLink(link.id)}
                      title="Remove"
                      style={{ padding: '0.4rem 0.6rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  className="cb-btn cb-btn-primary"
                  onClick={addLink}
                  style={{ marginTop: '0.8rem' }}
                >
                  + Add Social Link
                </button>
              </div>
            )}

            {/* BRANDING & STYLING TAB */}
            {activeTab === 'design' && (
              <div className="cb-tab-panel">
                <div className="cb-section-title">
                  <Palette size={16} className="cb-title-icon" /> Color Palettes
                </div>
                <label className="cb-label">Predefined Presets</label>
                <div className="cb-color-picker-grid">
                  {COLOR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      className="cb-color-dot"
                      style={{ background: preset.bg, borderBottomColor: preset.primary }}
                      title={preset.name}
                      onClick={() => applyColorPreset(preset)}
                    />
                  ))}
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <label className="cb-label">Custom Palette Colors</label>
                  <div className="cb-control-group row">
                    <div>
                      <span className="cb-label">Background</span>
                      <div className="cb-color-input-wrapper">
                        <input
                          type="color"
                          className="cb-color-picker"
                          value={customColors.bg}
                          onChange={(e) => setCustomColors(prev => ({ ...prev, bg: e.target.value, override: true }))}
                        />
                        <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{customColors.bg}</span>
                      </div>
                    </div>
                    <div>
                      <span className="cb-label">Text Color</span>
                      <div className="cb-color-input-wrapper">
                        <input
                          type="color"
                          className="cb-color-picker"
                          value={customColors.text}
                          onChange={(e) => setCustomColors(prev => ({ ...prev, text: e.target.value, override: true }))}
                        />
                        <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{customColors.text}</span>
                      </div>
                    </div>
                  </div>
                  <div className="cb-control-group row">
                    <div>
                      <span className="cb-label">Brand Primary</span>
                      <div className="cb-color-input-wrapper">
                        <input
                          type="color"
                          className="cb-color-picker"
                          value={customColors.primary}
                          onChange={(e) => setCustomColors(prev => ({ ...prev, primary: e.target.value, override: true }))}
                        />
                        <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{customColors.primary}</span>
                      </div>
                    </div>
                    <div>
                      <span className="cb-label">Accent Highlight</span>
                      <div className="cb-color-input-wrapper">
                        <input
                          type="color"
                          className="cb-color-picker"
                          value={customColors.accent}
                          onChange={(e) => setCustomColors(prev => ({ ...prev, accent: e.target.value, override: true }))}
                        />
                        <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{customColors.accent}</span>
                      </div>
                    </div>
                  </div>
                  {customColors.override && (
                    <button
                      className="cb-quick-btn"
                      onClick={() => setCustomColors(prev => ({ ...prev, override: false }))}
                      style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                    >
                      <RefreshCw size={12} /> Reset to Theme Colors
                    </button>
                  )}
                </div>



                <div className="cb-section-title" style={{ marginTop: '2rem' }}>
                  <ImageIcon size={16} className="cb-title-icon" /> Company Logo
                </div>
                <div className="cb-control-group">
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button
                      className={`cb-quick-btn ${details.logoType === 'predefined' ? 'active' : ''}`}
                      onClick={() => handleInputChange('logoType', 'predefined')}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Vector Presets
                    </button>
                    <button
                      className={`cb-quick-btn ${details.logoType === 'uploaded' ? 'active' : ''}`}
                      onClick={() => handleInputChange('logoType', 'uploaded')}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Upload Custom Logo
                    </button>
                  </div>

                  {details.logoType === 'predefined' ? (
                    <div>
                      <label className="cb-label">Select Mark Symbol</label>
                      <div className="cb-logo-grid">
                        {PREDEFINED_LOGOS.map((logo, idx) => (
                          <div
                            key={idx}
                            className={`cb-logo-item ${details.predefinedLogoIdx === idx ? 'active' : ''}`}
                            onClick={() => handleInputChange('predefinedLogoIdx', idx)}
                          >
                            {logo.svg('currentColor')}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="cb-label">Upload Image (SVG, PNG, JPG)</label>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button
                          className="cb-btn cb-btn-secondary"
                          onClick={() => fileInputRef.current.click()}
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          <Upload size={14} /> Browse Image
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleLogoUpload}
                          accept="image/*"
                          style={{ display: 'none' }}
                        />
                        {details.uploadedLogoUrl && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <img src={details.uploadedLogoUrl} alt="Logo thumb" style={{ width: '30px', height: '30px', objectFit: 'contain', border: '1px solid #334155', borderRadius: '4px' }} />
                            <button
                              className="doc-action-btn delete"
                              onClick={() => handleInputChange('uploadedLogoUrl', '')}
                              style={{ padding: '4px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LAYOUT TAB */}
            {activeTab === 'layout' && (
              <div className="cb-tab-panel">
                <div className="cb-section-title">
                  <Layout size={16} className="cb-title-icon" /> Size & Shape
                </div>
                <div className="cb-control-group">
                  <label className="cb-label">Card Orientation</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className={`cb-quick-btn ${orientation === 'landscape' ? 'active' : ''}`}
                      onClick={() => setOrientation('landscape')}
                      style={{ flex: 1, justifyContent: 'center', padding: '0.6rem' }}
                    >
                      Horizontal (3.5" x 2")
                    </button>
                    <button
                      className={`cb-quick-btn ${orientation === 'portrait' ? 'active' : ''}`}
                      onClick={() => setOrientation('portrait')}
                      style={{ flex: 1, justifyContent: 'center', padding: '0.6rem' }}
                    >
                      Vertical (2" x 3.5")
                    </button>
                  </div>
                </div>

                <div className="cb-control-group">
                  <label className="cb-label">Card Corner Roundness</label>
                  <div className="cb-slider-wrapper">
                    <input
                      type="range"
                      className="cb-slider"
                      min="0"
                      max="24"
                      value={borderRadius}
                      onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                    />
                    <span className="cb-slider-val">{borderRadius}px</span>
                  </div>
                </div>

                <div className="cb-control-group">
                  <label className="cb-label">Typography Font</label>
                  <select
                    className="cb-select"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                  >
                    <option value="Montserrat">Montserrat (Modern Sans)</option>
                    <option value="Playfair Display">Playfair Display (Luxury Serif)</option>
                    <option value="Outfit">Outfit (Clean Geometric)</option>
                    <option value="Inter">Inter (System Functional)</option>
                    <option value="Fira Code">Fira Code (Tech / Developer)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Live Canvas Preview Panel */}
        <main className="card-builder-canvas">
          {theme === 'glassmorphism' && (
            <>
              <div className="canvas-glass-bg canvas-glass-bg-1" />
              <div className="canvas-glass-bg canvas-glass-bg-2" />
            </>
          )}

          <div className="cb-canvas-actions">
            <div className="cb-canvas-toggle-group">
              <span className="cb-canvas-toggle-btn active">
                <RotateCw size={14} /> Side-by-Side Double View
              </span>
            </div>

            <div className="cb-quick-actions">
              <button className="cb-quick-btn" onClick={() => {
                const company = getDB().company || {};
                setDetails(prev => ({
                  ...prev,
                  companyName: company.name || 'Acme Corporation',
                  tagline: company.industry || 'Consulting & Services',
                  fullName: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Jane Doe',
                  phone: company.phone || '+91 98765 43210',
                  email: user?.email || 'jane@acme.com',
                  website: company.website || 'www.acmecorp.com',
                  address: company.address || '123 Business Boulevard, Mumbai, MH, 400001'
                }));
              }}>
                <RefreshCw size={12} /> Sync Profile Data
              </button>
            </div>
          </div>

          {/* Cards Grid Display */}
          <div className={`cb-cards-grid ${orientation}`}>

            {/* FRONT SIDE PREVIEW */}
            <div className="cb-card-wrapper">
              <div className="cb-card-label">Front Side</div>
              <div
                className={`business-card ${orientation} card-theme-${theme}`}
                style={frontCardStyle}
              >
                {/* Geometrical/Abstract Background lines on specific themes */}
                {theme === 'creative' && (
                  <svg className="card-bg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polygon points="0,0 60,0 30,100 0,100" fill={colors.primary} opacity="0.1" />
                    <polygon points="100,100 40,100 70,0 100,0" fill={colors.accent} opacity="0.1" />
                  </svg>
                )}

                <div className="card-content">
                  {/* Card Header: Logo & Company Name */}
                  <div className="cb-card-header">
                    <div className="cb-card-logo-title">
                      <div className="cb-card-logo" style={{ color: colors.primary }}>
                        {renderLogo(colors.primary, 32)}
                      </div>
                      <div>
                        <h3 className="cb-card-company-name" style={{ color: colors.primary }}>{details.companyName || 'COMPANY NAME'}</h3>
                        <p className="cb-card-company-tagline">{details.tagline || 'Tagline / Industry'}</p>
                      </div>
                    </div>
                    <div className="cb-card-badge" style={{ background: theme === 'luxury' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.08)', color: colors.accent }}>
                      Member
                    </div>
                  </div>

                  {/* Card Body: Name, Role & contact info */}
                  <div className="cb-card-body">
                    <div className="cb-card-profile">
                      <h2 className="cb-card-name">{details.fullName || 'Full Name'}</h2>
                      <span className="cb-card-designation luxury-accent" style={{ color: colors.accent }}>{details.designation || 'Designation'}</span>
                    </div>

                    <div className="cb-card-details">
                      {details.phone && (
                        <div className="cb-card-detail-item">
                          <Phone size={11} style={{ color: colors.accent }} />
                          <span>{details.phone}</span>
                        </div>
                      )}
                      {details.email && (
                        <div className="cb-card-detail-item">
                          <Mail size={11} style={{ color: colors.accent }} />
                          <span>{details.email}</span>
                        </div>
                      )}
                      {details.website && (
                        <div className="cb-card-detail-item">
                          <Globe size={11} style={{ color: colors.accent }} />
                          <span>{details.website}</span>
                        </div>
                      )}
                      {details.address && (
                        <div className="cb-card-detail-item">
                          <MapPin size={11} style={{ color: colors.accent }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                            {details.address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BACK SIDE PREVIEW */}
            <div className="cb-card-wrapper">
              <div className="cb-card-label">Back Side</div>
              <div
                className={`business-card ${orientation} card-theme-${theme}`}
                style={backCardStyle}
              >
                {/* Geometrical/Abstract Background lines on specific themes */}
                {theme === 'creative' && (
                  <svg className="card-bg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <circle cx="50" cy="50" r="40" fill={colors.primary} opacity="0.08" />
                    <polygon points="0,0 20,0 0,60" fill={colors.accent} opacity="0.1" />
                    <polygon points="100,100 80,100 100,40" fill={colors.primary} opacity="0.1" />
                  </svg>
                )}

                <div className="card-content" style={{ justifyContent: 'center' }}>
                  <div className="card-back-centered">
                    <div className="cb-card-logo-title">
                      <div className="cb-card-logo" style={{ color: colors.primary, transform: 'scale(1.4)', marginBottom: '4px' }}>
                        {renderLogo(colors.primary, 36)}
                      </div>
                      <div>
                        <h3 className="cb-card-company-name" style={{ color: colors.primary, fontSize: '1.25rem' }}>{details.companyName || 'COMPANY NAME'}</h3>
                        <p className="cb-card-company-tagline" style={{ fontSize: '0.75rem', opacity: 0.8 }}>{details.tagline || 'Tagline / Industry'}</p>
                      </div>
                    </div>
                    {renderSocialIcons(30, true)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* OFF-SCREEN PRINT & Capture CONTAINER */}
      <div id="business-card-print-area" className="pdf-print-area" style={{ position: 'absolute', left: '-9999px', top: '-9999px', display: 'none' }}>
        <h1 className="print-page-title">Digital Visiting Card Export</h1>
        <div className="print-cards-grid">

          {/* Card Print Row 1 */}
          <div className="print-card-row">
            <span className="print-card-desc">Front Side</span>
            <div className={`business-card ${orientation} card-theme-${theme}`} style={frontCardStyle}>
              <div className="card-content">
                <div className="cb-card-header">
                  <div className="cb-card-logo-title">
                    <div className="cb-card-logo" style={{ color: colors.primary }}>
                      {renderLogo(colors.primary, 32)}
                    </div>
                    <div>
                      <h3 className="cb-card-company-name" style={{ color: colors.primary }}>{details.companyName || 'COMPANY NAME'}</h3>
                      <p className="cb-card-company-tagline">{details.tagline || 'Tagline / Industry'}</p>
                    </div>
                  </div>
                  <div className="cb-card-badge" style={{ background: theme === 'luxury' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0, 0, 0, 0.08)', color: colors.accent }}>
                    Member
                  </div>
                </div>
                <div className="cb-card-body">
                  <div className="cb-card-profile">
                    <h2 className="cb-card-name">{details.fullName || 'Full Name'}</h2>
                    <span className="cb-card-designation" style={{ color: colors.accent }}>{details.designation || 'Designation'}</span>
                  </div>
                  <div className="cb-card-details">
                    {details.phone && <div className="cb-card-detail-item"><Phone size={11} /> <span>{details.phone}</span></div>}
                    {details.email && <div className="cb-card-detail-item"><Mail size={11} /> <span>{details.email}</span></div>}
                    {details.website && <div className="cb-card-detail-item"><Globe size={11} /> <span>{details.website}</span></div>}
                    {details.address && <div className="cb-card-detail-item"><MapPin size={11} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>{details.address}</span></div>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Print Row 2 */}
          <div className="print-card-row">
            <span className="print-card-desc">Back Side</span>
            <div className={`business-card ${orientation} card-theme-${theme}`} style={backCardStyle}>
              <div className="card-content" style={{ justifyContent: 'center' }}>
                <div className="card-back-centered">
                  <div className="cb-card-logo-title">
                    <div className="cb-card-logo" style={{ color: colors.primary, transform: 'scale(1.4)', marginBottom: '4px' }}>
                      {renderLogo(colors.primary, 36)}
                    </div>
                    <div>
                      <h3 className="cb-card-company-name" style={{ color: colors.primary }}>{details.companyName || 'COMPANY NAME'}</h3>
                      <p className="cb-card-company-tagline">{details.tagline || 'Tagline / Industry'}</p>
                    </div>
                  </div>
                  {renderSocialIcons(28, false)}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* CROP MODAL OVERLAY */}
      {showCropModal && (
        <div className="cb-crop-modal-overlay">
          <div className="cb-crop-modal-container">
            <div className="cb-crop-modal-header">
              <h3>Crop Card Background ({cropSide === 'front' ? 'Front Side' : 'Back Side'})</h3>
              <p>Drag to reposition, use slider below to zoom</p>
            </div>
            <div className="cb-crop-modal-body">
              <div className="cb-crop-area-wrapper">
                <Cropper
                  image={tempImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={getCropAspectRatio()}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
            </div>
            <div className="cb-crop-modal-footer">
              <div className="cb-zoom-slider-container">
                <span>Zoom:</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="cb-slider"
                />
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <div className="cb-crop-modal-actions">
                <button
                  className="cb-btn cb-btn-secondary"
                  onClick={() => {
                    setShowCropModal(false);
                    setTempImage(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="cb-btn cb-btn-primary"
                  onClick={handleApplyCrop}
                >
                  Crop & Apply Background
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
