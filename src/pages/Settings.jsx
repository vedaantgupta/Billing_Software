import React, { useState, useEffect } from 'react';
import { Shield, Users, Activity, Plus, Building2, Save, PenTool, Eraser, RotateCcw, RotateCw, Trash2, Upload, Fingerprint, Type } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDB, saveDB, getItems, logActivity } from '../utils/db'; // Import our local DB
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './Settings.css';

const staffMembers = [
  { id: 1, name: 'Admin User', role: 'Super Admin', email: 'admin@company.com' },
  { id: 2, name: 'John Sales', role: 'Sales Executive', email: 'john@company.com' },
  { id: 3, name: 'Jane Viewer', role: 'Accountant', email: 'jane@company.com' }
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user } = useAuth();

  // ✅ Crop states (MUST be outside)
  const [crop, setCrop] = useState({
    unit: '%',
    width: 50,
    height: 50,
    x: 25,
    y: 25
  });

  const [showCropper, setShowCropper] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = React.useRef(null);
  const [aspect, setAspect] = useState(1); // default 1:1
  const [isFreeMode, setIsFreeMode] = useState(false);
  // Company Profile State
  const [companyProfile, setCompanyProfile] = useState({
    name: '',
    gstin: '',
    address: '',
    state: '',
    stateCode: '',
    email: '',
    phone: '',
    ownerName: '',
    pan: '',
    bankName: '',
    bankBranch: '',
    bankAccNumber: '',
    bankIfsc: '',
    upiId: '',
    paymentTerms: '100% advance against finalization of offer',
    terms: 'Subject to our home Jurisdiction.\nOur Responsibility Ceases as soon as goods leave our Premises.\nGoods once sold will not be taken back.',
    salaryCycleStart: '1',
    logo: null,
    signature: null
  });

  const [penColor, setPenColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const canvasRef = React.useRef(null);

  // New States for Signature Enhancements
  const [signatureMode, setSignatureMode] = useState('draw'); // 'draw' | 'type'
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState('Caveat');
  const [isEraser, setIsEraser] = useState(false);

  // Load Google Fonts for Typed Signatures
  useEffect(() => {
    if (!document.getElementById('sig-fonts')) {
      const style = document.createElement('style');
      style.id = 'sig-fonts';
      style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Dancing+Script:wght@600&family=Great+Vibes&display=swap');`;
      document.head.appendChild(style);
    }
  }, []);

  // Initialize Canvas
  useEffect(() => {
    if (activeTab === 'signature' && signatureMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
    }
  }, [activeTab, signatureMode]);

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setUndoStack(prev => [...prev, canvas.toDataURL()]);
    setRedoStack([]); // Clear redo stack on new stroke
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = isEraser ? 15 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    setIsDrawing(true);
    if (!isEraser) setIsCanvasEmpty(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsCanvasEmpty(true);
    setUndoStack([]);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const lastState = undoStack[undoStack.length - 1];
    const img = new Image();
    img.src = lastState;
    img.onload = () => {
      setRedoStack(prev => [...prev, canvas.toDataURL()]); // Save current state to redo
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setUndoStack(prev => prev.slice(0, -1));
      if (undoStack.length === 1) setIsCanvasEmpty(true);
    };
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const nextState = redoStack[redoStack.length - 1];
    const img = new Image();
    img.src = nextState;
    img.onload = () => {
      setUndoStack(prev => [...prev, canvas.toDataURL()]);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setRedoStack(prev => prev.slice(0, -1));
      setIsCanvasEmpty(false);
    };
  };

  const saveFromCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setCompanyProfile({ ...companyProfile, signature: dataUrl });
    alert('Drawn signature captured! Click "Save All Signature Settings" below to persist.');
  };

  const saveTypedSignature = () => {
    if (!typedName.trim()) return;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = penColor;

    let fontStr = `60px "${selectedFont}", cursive`;
    if (selectedFont === 'Great Vibes') fontStr = `75px "${selectedFont}", cursive`;
    else if (selectedFont === 'Dancing Script') fontStr = `65px "${selectedFont}", cursive`;

    ctx.font = fontStr;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

    setCompanyProfile({ ...companyProfile, signature: canvas.toDataURL('image/png') });
    alert('Typed signature captured! Click "Save All Signature Settings" below to persist.');
  };


  const [activityLogs, setActivityLogs] = useState([]);

  useEffect(() => {
    const db = getDB();
    if (db.company) {
      setCompanyProfile(prev => {
        const merged = { ...prev, ...db.company };
        // Prevent controlled to uncontrolled input warnings
        Object.keys(merged).forEach(key => {
          if (merged[key] === null || merged[key] === undefined) {
            merged[key] = '';
          }
        });
        return merged;
      });
    }
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      if (user?.id && activeTab === 'activity') {
        const logs = await getItems('activityLogs', user.id);
        setActivityLogs(logs || []);
      }
    };
    fetchLogs();
  }, [user, activeTab]);

  const handleCompanyProfileSave = async (e) => {
    e.preventDefault();
    try {
      const db = getDB();
      db.company = companyProfile;
      saveDB(db);

      if (user?.id) {
        await logActivity('Updated Company Profile Setup', user.id, user.username || user.firstName || 'You');
      }

      alert('Settings updated successfully!');
    } catch (err) {
      console.error('Failed to update settings:', err);
      alert('Failed to update settings');
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only image files allowed!');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setShowCropper(true); // 👈 open crop UI
    };
    reader.readAsDataURL(file);
  };


  const getCroppedImg = () => {
    if (!completedCrop || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return canvas.toDataURL('image/png');
  };

  const handleCropSave = async () => {
    const croppedImage = await getCroppedImg();
    setCompanyProfile({ ...companyProfile, logo: croppedImage });
    setShowCropper(false);
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyProfile({ ...companyProfile, signature: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>

      {/* ---------------- CROPPER MODAL ---------------- */}
      {showCropper && (
        <div className="cropper-overlay">
          <div className="cropper-modal">

            {/* Header */}
            <div className="cropper-header">
              <h3>Crop Image</h3>
              <button
                onClick={() => setShowCropper(false)}
                className="cropper-close"
              >
                ✕
              </button>
            </div>

            {/* Crop Area */}
            <div className="cropper-body">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={isFreeMode ? undefined : aspect}
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop"
                  style={{ maxWidth: '100%' }}
                />
              </ReactCrop>
            </div>

            {/* Controls */}
            <div className="cropper-controls">

              {/* Aspect Ratios */}
              <div className="ratio-buttons">

                <button onClick={() => {
                  setIsFreeMode(false);
                  setAspect(1);
                  setCrop({ unit: '%', width: 50, height: 50, x: 25, y: 25 });
                }}>
                  1:1
                </button>

                <button onClick={() => {
                  setIsFreeMode(false);
                  setAspect(16 / 9);
                  setCrop({ unit: '%', width: 80, height: 45, x: 10, y: 10 });
                }}>
                  16:9
                </button>

                <button onClick={() => {
                  setIsFreeMode(false);
                  setAspect(9 / 16);
                  setCrop({ unit: '%', width: 45, height: 80, x: 10, y: 10 });
                }}>
                  9:16
                </button>

                <button onClick={() => {
                  setIsFreeMode(false);
                  setAspect(4 / 5);
                  setCrop({ unit: '%', width: 60, height: 75, x: 20, y: 10 });
                }}>
                  4:5
                </button>

                <button onClick={() => {
                  setIsFreeMode(false);
                  setAspect(3 / 2);
                  setCrop({ unit: '%', width: 75, height: 50, x: 10, y: 20 });
                }}>
                  3:2
                </button>

                <button onClick={() => {
                  setIsFreeMode(false);
                  setAspect(4 / 3);
                  setCrop({ unit: '%', width: 70, height: 52, x: 15, y: 15 });
                }}>
                  4:3
                </button>

                <button onClick={() => {
                  setIsFreeMode(true);
                  setAspect(undefined);
                }}>
                  Free
                </button>

              </div>

              {/* Zoom Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>

                <button
                  onClick={() => setZoom(z => Math.max(1, z - 0.2))}
                  className="btn btn-secondary"
                >
                  −
                </button>

                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  style={{ flex: 1 }}
                />

                <button
                  onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                  className="btn btn-secondary"
                >
                  +
                </button>

              </div>

              {/* Modal Actions */}
              <div className="cropper-actions">

                <button
                  onClick={() => setShowCropper(false)}
                  className="cancel-btn"
                >
                  ❌ Cancel
                </button>

                <button
                  onClick={handleCropSave}
                  className="save-btn btn btn-primary"
                >
                  Save Crop
                </button>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* ---------------- PAGE HEADER ---------------- */}
      <div className="page-header">
        <h1 className="page-title">Settings & My Profile</h1>
      </div>

      <div className="flex gap-2 mb-4" style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('profile')} style={{ whiteSpace: 'nowrap' }}>
          <Building2 size={16} /> Company Profile
        </button>
        <button className={`btn ${activeTab === 'staff' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('staff')} style={{ whiteSpace: 'nowrap' }}>
          <Users size={16} /> Staff Accounts
        </button>
        <button className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('security')} style={{ whiteSpace: 'nowrap' }}>
          <Shield size={16} /> Data Security
        </button>
        <button className={`btn ${activeTab === 'activity' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('activity')} style={{ whiteSpace: 'nowrap' }}>
          <Activity size={16} /> Activity Log
        </button>
        <button className={`btn ${activeTab === 'signature' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('signature')} style={{ whiteSpace: 'nowrap' }}>
          <Fingerprint size={16} /> Digital Signature
        </button>
      </div>

      <div className="glass" style={{ padding: '2rem' }}>

        {activeTab === 'profile' && (
          <div>
            <h3 className="mb-4">Business / Company Setup</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Update your company details. These changes will automatically reflect universally on all your printed Invoices, Quotations, and E-Way bills.</p>

            <form onSubmit={handleCompanyProfileSave} className="flex flex-col gap-6">
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '150px',
                    height: '150px',
                    background: '#f8fafc',
                    border: '2px dashed #e2e8f0',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    flexShrink: 0   // ✅ prevents shrinking in flex layout
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.background = '#f1f5ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                >                  {companyProfile.logo ? (
                  <>
                    <img src={companyProfile.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // 🔥 prevents file input click
                        setCompanyProfile({ ...companyProfile, logo: null });
                      }}
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#ef4444',
                        zIndex: 10 // 🔥 ensures button stays on top
                      }}
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <i className="bi bi-upload" style={{ fontSize: '28px' }}></i>
                    <div style={{ fontSize: '12px', marginTop: '6px' }}>
                      Click to Upload
                    </div>
                  </div>
                )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 1 // 👇 keep it below button
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="form-group w-full mb-4">
                    <label className="form-label">Company / Business Name *</label>
                    <input required className="form-input" value={companyProfile.name} onChange={e => setCompanyProfile({ ...companyProfile, name: e.target.value })} />
                  </div>
                  <div className="form-group w-full mb-0">
                    <label className="form-label">GSTIN (Optional)</label>
                    <input className="form-input" value={companyProfile.gstin} onChange={e => setCompanyProfile({ ...companyProfile, gstin: e.target.value })} placeholder="27AABCU9603R1ZM" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="form-group w-full" style={{ flex: 1 }}>
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" value={companyProfile.email} onChange={e => setCompanyProfile({ ...companyProfile, email: e.target.value })} />
                </div>
                <div className="form-group w-full" style={{ flex: 1 }}>
                  <label className="form-label">Phone / Mobile</label>
                  <input className="form-input" value={companyProfile.phone} onChange={e => setCompanyProfile({ ...companyProfile, phone: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="form-group w-full" style={{ flex: 1 }}>
                  <label className="form-label">Owner / Authorised Name</label>
                  <input className="form-input" value={companyProfile.ownerName} onChange={e => setCompanyProfile({ ...companyProfile, ownerName: e.target.value })} placeholder="e.g. John Doe" />
                </div>
                <div className="form-group w-full" style={{ flex: 1 }}>
                  <label className="form-label">PAN Number</label>
                  <input className="form-input" value={companyProfile.pan} onChange={e => setCompanyProfile({ ...companyProfile, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" />
                </div>
              </div>

              <div className="form-group w-full">
                <label className="form-label">Registered Address</label>
                <textarea className="form-input" rows="3" value={companyProfile.address} onChange={e => setCompanyProfile({ ...companyProfile, address: e.target.value })}></textarea>
              </div>

              <div className="flex gap-4">
                <div className="form-group w-full" style={{ flex: 1 }}>
                  <label className="form-label">State Name</label>
                  <input className="form-input" value={companyProfile.state} onChange={e => setCompanyProfile({ ...companyProfile, state: e.target.value })} />
                </div>
                <div className="form-group w-full" style={{ flex: 1 }}>
                  <label className="form-label">State Code (CRITICAL FOR GST)</label>
                  <input required className="form-input" value={companyProfile.stateCode} onChange={e => setCompanyProfile({ ...companyProfile, stateCode: e.target.value })} placeholder="e.g. 27 for Maharashtra" />
                </div>
              </div>

              <div className="bank-payment-section" style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1.5px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', color: '#1e293b' }}>🏦 Bank & Payment Details (For Invoices)</h4>
                <div className="flex gap-4">
                  <div className="form-group w-full" style={{ flex: 1 }}>
                    <label className="form-label">Bank Name</label>
                    <input className="form-input" value={companyProfile.bankName} onChange={e => setCompanyProfile({ ...companyProfile, bankName: e.target.value })} placeholder="e.g. HDFC Bank" />
                  </div>
                  <div className="form-group w-full" style={{ flex: 1 }}>
                    <label className="form-label">Branch Name</label>
                    <input className="form-input" value={companyProfile.bankBranch} onChange={e => setCompanyProfile({ ...companyProfile, bankBranch: e.target.value })} placeholder="e.g. Khelgaon, Delhi" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="form-group w-full" style={{ flex: 1 }}>
                    <label className="form-label">Account Number</label>
                    <input className="form-input" value={companyProfile.bankAccNumber} onChange={e => setCompanyProfile({ ...companyProfile, bankAccNumber: e.target.value })} placeholder="0000123456789" />
                  </div>
                  <div className="form-group w-full" style={{ flex: 1 }}>
                    <label className="form-label">IFSC Code</label>
                    <input className="form-input" value={companyProfile.bankIfsc} onChange={e => setCompanyProfile({ ...companyProfile, bankIfsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234" />
                  </div>
                </div>
                <div className="form-group w-full" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label">UPI ID / VPA (For QR Payment) *</label>
                  <input className="form-input" placeholder="e.g. business@okaxis" value={companyProfile.upiId} onChange={e => setCompanyProfile({ ...companyProfile, upiId: e.target.value })} />
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>This ID generates the payment QR code on your invoices.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="form-group w-full" style={{ flex: 1 }}>
                  <label className="form-label">Default Payment Conditions</label>
                  <input className="form-input" value={companyProfile.paymentTerms} onChange={e => setCompanyProfile({ ...companyProfile, paymentTerms: e.target.value })} placeholder="e.g. 100% advance" />
                </div>
                <div className="form-group w-full" style={{ flex: 1 }}>
                  <label className="form-label">Global Salary Date (Cycle Start)</label>
                  <input className="form-input" type="number" min="1" max="31" value={companyProfile.salaryCycleStart} onChange={e => setCompanyProfile({ ...companyProfile, salaryCycleStart: e.target.value })} placeholder="e.g. 1" />
                </div>
              </div>

              <div className="form-group w-full">
                <label className="form-label">Default Terms & Conditions</label>
                <textarea className="form-input" rows="3" value={companyProfile.terms} onChange={e => setCompanyProfile({ ...companyProfile, terms: e.target.value })}></textarea>
              </div>

              <div className="mt-4 pt-4 flex gap-4" style={{ borderTop: '2px solid var(--border-color)' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                  <Save size={18} style={{ marginRight: '0.5rem', display: 'inline' }} /> Save Profile Preferences
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'staff' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p style={{ color: 'var(--text-secondary)' }}>Manage up to 10 staff accounts. Assign role-based permissions.</p>
              <button className="btn btn-primary"><Plus size={16} /> Add Staff</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>Email</th>
                  <th style={{ padding: '1rem' }}>Role</th>
                  <th style={{ padding: '1rem' }}>Permissions</th>
                </tr>
              </thead>
              <tbody>
                {staffMembers.map(staff => (
                  <tr key={staff.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{staff.name}</td>
                    <td style={{ padding: '1rem' }}>{staff.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        background: staff.role === 'Super Admin' ? '#ffedd5' : '#e0e7ff',
                        color: staff.role === 'Super Admin' ? '#c2410c' : '#4338ca',
                        padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600
                      }}>
                        {staff.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {staff.role === 'Super Admin' ? 'All Access' : 'Invoices, Quotations, Read-only Reports'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <h3 className="mb-4">Cloud Security Dashboard</h3>
            <div className="flex gap-4">
              <div className="glass w-full security-card" style={{ padding: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <Shield size={32} color="#16a34a" className="mb-2" />
                <h4 style={{ margin: 0 }}>End-to-End Encryption</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>All data transmitted is secured with 256-bit SSL encryption.</p>
              </div>
              <div className="glass w-full security-card" style={{ padding: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <Activity size={32} color="#16a34a" className="mb-2" />
                <h4 style={{ margin: 0 }}>Automated Cloud Backups</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Database runs daily automated snapshots ensuring zero data loss.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <h3 className="mb-4">System Activity Log</h3>
            <div className="activity-log-item" style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
              {activityLogs.map((log, i) => (
                <div key={i} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                  <div className="activity-log-dot" style={{ position: 'absolute', left: '-1.35rem', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary-color)' }}></div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{log.time}</div>
                  <div><strong>{log.user}</strong> {log.action}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'signature' && (
          <div className="signature-section">
            <h3 className="mb-2">Digital Signature Setup</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Create or upload your official digital signature. This will be automatically applied to all your Invoices, Quotations, and Payment Receipts.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
              {/* Creator Area */}
              <div className="glass signature-creator" style={{ padding: '1.5rem', background: '#fff' }}>
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <button className={`btn ${signatureMode === 'draw' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSignatureMode('draw')}>
                    <PenTool size={16} /> Draw Signature
                  </button>
                  <button className={`btn ${signatureMode === 'type' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSignatureMode('type')}>
                    <Type size={16} /> Type Signature
                  </button>
                </div>

                {signatureMode === 'draw' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={() => { setIsEraser(false); setPenColor('#000000'); }} style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#000', border: !isEraser && penColor === '#000000' ? '3px solid var(--primary-color)' : '1px solid #ddd', cursor: 'pointer' }} title="Black Pen" />
                        <button onClick={() => { setIsEraser(false); setPenColor('#0000b3'); }} style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#0000b3', border: !isEraser && penColor === '#0000b3' ? '3px solid var(--primary-color)' : '1px solid #ddd', cursor: 'pointer' }} title="Blue Pen" />
                        <button onClick={() => { setIsEraser(false); setPenColor('#cc0000'); }} style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#cc0000', border: !isEraser && penColor === '#cc0000' ? '3px solid var(--primary-color)' : '1px solid #ddd', cursor: 'pointer' }} title="Red Pen" />
                        <div style={{ borderLeft: '1px solid #cbd5e1', height: '24px', margin: '0 0.5rem' }}></div>
                        <button className={`btn ${isEraser ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIsEraser(!isEraser)} style={{ padding: '6px 10px', fontSize: '12px' }} title="Eraser Tool">
                          <i className="bi bi-eraser-fill" style={{ fontSize: '14px' }}></i> Eraser
                        </button>
                      </div>
                    </div>

                    <div className="signature-canvas-box" style={{ border: '2px dashed #e2e8f0', borderRadius: '8px', background: '#f8fafc', position: 'relative', height: '250px' }}>
                      <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseOut={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        style={{
                          width: '100%',
                          height: '100%',
                          cursor: isEraser
                            ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' fill=\'currentColor\' class=\'bi bi-eraser-fill\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm.66 11.34L3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16z\'/%3E%3C/svg%3E") 0 24, auto'
                            : 'crosshair',
                          touchAction: 'none'
                        }}
                      />
                      {(undoStack.length > 0 || redoStack.length > 0 || !isCanvasEmpty) && (
                        <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '0.5rem' }}>
                          {undoStack.length > 0 && (
                            <button className="btn btn-secondary" onClick={undo} style={{ padding: '4px 8px', fontSize: '11px' }}>
                              <RotateCcw size={12} /> Undo
                            </button>
                          )}
                          {redoStack.length > 0 && (
                            <button className="btn btn-secondary" onClick={redo} style={{ padding: '4px 8px', fontSize: '11px' }}>
                              <RotateCw size={12} /> Redo
                            </button>
                          )}
                          {!isCanvasEmpty && (
                            <button className="btn btn-secondary" onClick={clearCanvas} style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444' }}>
                              <Trash2 size={12} /> Clear
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Tip: Use "Eraser" to correct lines or erase mistakes.
                      </div>
                      <button className="btn btn-primary" onClick={saveFromCanvas} disabled={isCanvasEmpty}>
                        <PenTool size={16} /> Use This Drawing
                      </button>
                    </div>
                  </>
                )}

                {signatureMode === 'type' && (
                  <div style={{ minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
                    <div className="form-group">
                      <label className="form-label">Type Your Name</label>
                      <input
                        className="form-input"
                        placeholder="e.g. John Doe"
                        value={typedName}
                        onChange={e => setTypedName(e.target.value)}
                        style={{ fontSize: '1.2rem', padding: '0.875rem' }}
                      />
                    </div>

                    <div className="flex gap-4 mt-2">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Select Style</label>
                        <select className="form-input" value={selectedFont} onChange={e => setSelectedFont(e.target.value)}>
                          <option value="Caveat">Modern Casual</option>
                          <option value="Dancing Script">Elegant Cursive</option>
                          <option value="Great Vibes">Classic Calligraphy</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Color</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button onClick={() => setPenColor('#000000')} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#000', border: penColor === '#000000' ? '3px solid var(--primary-color)' : '1px solid #ddd', cursor: 'pointer' }} />
                          <button onClick={() => setPenColor('#0000b3')} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0000b3', border: penColor === '#0000b3' ? '3px solid var(--primary-color)' : '1px solid #ddd', cursor: 'pointer' }} />
                        </div>
                      </div>
                    </div>

                    <div className="signature-canvas-box" style={{ flex: 1, border: '2px dashed #e2e8f0', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '1rem 0', minHeight: '130px', overflow: 'hidden' }}>
                      {typedName ? (
                        <div style={{ fontFamily: `"${selectedFont}", cursive`, fontSize: selectedFont === 'Great Vibes' ? '3.5rem' : '3rem', color: penColor, padding: '0 1rem' }}>
                          {typedName}
                        </div>
                      ) : (
                        <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Preview will appear here</div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-auto">
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Real-time generation using Google Fonts.
                      </div>
                      <button className="btn btn-primary" onClick={saveTypedSignature} disabled={!typedName.trim()}>
                        <Type size={16} /> Use Typed Signature
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload & Preview */}
              <div className="flex flex-col gap-4">
                <div className="glass signature-creator" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ marginBottom: '1rem', color: '#1e293b' }}>Signature Preview</h4>
                  <div className="signature-canvas-box" style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1rem', minHeight: '150px' }}>
                    {companyProfile.signature ? (
                      <img src={companyProfile.signature} alt="Signature Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                        <Fingerprint size={48} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '0.75rem' }}>No signature saved yet</p>
                      </div>
                    )}
                  </div>
                  {companyProfile.signature && (
                    <button
                      className="btn btn-secondary mt-2"
                      onClick={() => setCompanyProfile({ ...companyProfile, signature: null })}
                      style={{ color: '#ef4444', width: '100%' }}
                    >
                      <Trash2 size={14} /> Remove Signature
                    </button>
                  )}
                </div>

                <div className="glass signature-creator" style={{ padding: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: '#1e293b' }}>Upload Image</h4>
                  <div
                    className="signature-canvas-box"
                    style={{ border: '2px dashed #e2e8f0', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', position: 'relative' }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) handleSignatureUpload({ target: { files: [file] } });
                    }}
                  >
                    <Upload size={24} color="#94a3b8" />
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>Click or drag PNG/JPG signature</p>
                    <input type="file" accept="image/*" onChange={handleSignatureUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4" style={{ borderTop: '2px solid var(--border-color)' }}>
              <button className="btn btn-primary" onClick={handleCompanyProfileSave} style={{ padding: '0.75rem 2rem' }}>
                <Save size={18} style={{ marginRight: '0.5rem', display: 'inline' }} /> Save All Signature Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div >
  );
};

export default Settings;
