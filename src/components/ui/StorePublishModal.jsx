import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, CheckCircle, Package, FileText, Image as ImageIcon, Search, ShieldCheck, Plus, Trash2, Video, FileDown, DollarSign } from 'lucide-react';
import { CATEGORIES_TAXONOMY, getSubcategories } from '@/data/categoriesData';

const StorePublishModal = ({ isOpen, onClose, productData, onPublish }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (productData) {
      setFormData({
        // 1. Basic Info
        name: productData.name || '',
        shortDescription: productData.description || '',
        fullDescription: productData.fullDescription || '',
        hsn: productData.hsn || '',
        productGroup: productData.productGroup || 'Others',
        subCategory: productData.subCategory || '',
        brandName: productData.brandName || '',

        // 2. Pricing & Tax
        sellingPrice: productData.sellingPrice || '',
        purchasePrice: productData.purchasePrice || '',
        mrp: productData.mrp || '',
        saleDiscount: productData.saleDiscount || '0',
        taxRate: productData.taxRate || '18',
        tieredPricing: productData.tieredPricing || '',

        // 3. Inventory & Stock
        sku: productData.barcodeStr || '',
        barcodeStr: productData.barcodeStr || '',
        unit: productData.unit || 'Pieces (PCS)',
        openingStock: productData.stock || productData.openingStock || '0',
        lowStockAlert: productData.lowStockAlert || '5',
        warehouseLocation: productData.warehouseLocation || '',

        // 4. Specs & Variants
        variants: productData.variants || '',
        dimensions: productData.dimensions || '',
        weight: productData.weight || '',
        material: productData.material || '',
        countryOfOrigin: productData.countryOfOrigin || 'India',

        // 5. Media & Assets
        image: productData.image || null,
        gallery: Array.isArray(productData.gallery) ? productData.gallery : [],
        videos: Array.isArray(productData.videos) ? productData.videos : (productData.videoLink ? [productData.videoLink] : []),
        files: Array.isArray(productData.files) ? productData.files : (productData.downloadableFiles ? [productData.downloadableFiles] : []),

        // 6. Marketing & SEO
        metaTitle: productData.metaTitle || productData.name || '',
        metaDescription: productData.metaDescription || productData.description || '',
        urlSlug: productData.urlSlug || (productData.name ? productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : ''),
        productTags: productData.productTags || '',
        crossSellProducts: productData.crossSellProducts || '',

        // 7. Customer Trust
        warrantyInfo: productData.warrantyInfo || '',
        returnPolicy: productData.returnPolicy || '7 Days Returnable',
      });
    }
  }, [productData, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e, type, index) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: uploadData
      });
      if (response.ok) {
        const data = await response.json();
        if (type === 'mainImage') {
          setFormData(prev => ({ ...prev, image: data.url }));
        } else if (type === 'gallery') {
          const newGallery = [...(formData.gallery || [])];
          newGallery[index] = data.url;
          setFormData(prev => ({ ...prev, gallery: newGallery }));
        } else if (type === 'videos') {
          const newVideos = [...(formData.videos || [])];
          newVideos[index] = data.url;
          setFormData(prev => ({ ...prev, videos: newVideos }));
        } else if (type === 'files') {
          const newFiles = [...(formData.files || [])];
          newFiles[index] = data.url;
          setFormData(prev => ({ ...prev, files: newFiles }));
        }
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePublish = (e) => {
    e.preventDefault();
    onPublish({ ...productData, ...formData, isPublished: true });
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: <Package size={18} /> },
    { id: 'pricing', label: 'Pricing & Tax', icon: <DollarSign size={18} /> },
    { id: 'inventory', label: 'Inventory', icon: <FileText size={18} /> },
    { id: 'specs', label: 'Specs & Variants', icon: <Plus size={18} /> },
    { id: 'media', label: 'Media', icon: <ImageIcon size={18} /> },
    { id: 'seo', label: 'Marketing & SEO', icon: <Search size={18} /> },
    { id: 'trust', label: 'Customer Trust', icon: <ShieldCheck size={18} /> }
  ];

  const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab);

  const goNext = () => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1].id);
    }
  };

  const goPrevious = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabs[currentTabIndex - 1].id);
    }
  };

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem', paddingLeft: '270px' }}>
      <div className="glass" style={{ width: '1000px', maxWidth: '100%', height: '85vh', background: 'white', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>

        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Publish to Store: {formData.name}</h2>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fill in comprehensive details to optimize your storefront listing.</p>
          </div>
          <button type="button" onClick={onClose} className="btn" style={{ background: 'white', border: '1px solid #e2e8f0', padding: '8px' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar Tabs */}
          <div style={{ width: '240px', background: '#f1f5f9', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '1rem 0', overflowY: 'auto' }}>
            {tabs.map(tab => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem',
                  background: activeTab === tab.id ? 'white' : 'transparent',
                  border: 'none', borderLeft: `4px solid ${activeTab === tab.id ? 'var(--primary-color)' : 'transparent'}`,
                  color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
            <form
              id="publishForm"
              className="inventory-form"
              onSubmit={(e) => e.preventDefault()}
            >

              {activeTab === 'basic' && (
                <div className="flex flex-col gap-5 animation-fade-in">
                  <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', marginTop: 0 }}>1. Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group mb-0">
                      <label className="form-label">Product Name *</label>
                      <input required name="name" className="form-input" value={formData.name} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Brand Name</label>
                      <input name="brandName" className="form-input" value={formData.brandName} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group mb-0">
                      <label className="form-label">HSN/SAC Code</label>
                      <input name="hsn" className="form-input" value={formData.hsn} onChange={handleChange} placeholder="e.g. 8471" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Main Category</label>
                      <select 
                        name="productGroup" 
                        className="form-input" 
                        value={formData.productGroup || 'Electronics & Gadgets'} 
                        onChange={(e) => {
                          const cat = e.target.value;
                          const subs = getSubcategories(cat);
                          setFormData(prev => ({
                            ...prev,
                            productGroup: cat,
                            subCategory: subs[0] || 'General Products'
                          }));
                        }}
                      >
                        {CATEGORIES_TAXONOMY.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Sub-Category</label>
                      <select 
                        name="subCategory" 
                        className="form-input" 
                        value={formData.subCategory || ''} 
                        onChange={handleChange}
                      >
                        {getSubcategories(formData.productGroup).map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">Short Description (Preview)</label>
                    <textarea name="shortDescription" className="form-input" rows="2" value={formData.shortDescription} onChange={handleChange} placeholder="Brief summary for listings..."></textarea>
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">Full Description</label>
                    <textarea name="fullDescription" className="form-input" rows="5" value={formData.fullDescription} onChange={handleChange} placeholder="Detailed features, benefits, usage instructions..."></textarea>
                  </div>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="flex flex-col gap-5 animation-fade-in">
                  <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', marginTop: 0 }}>2. Pricing & Tax</h3>
                  <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group mb-0">
                      <label className="form-label">Selling Price *</label>
                      <input type="number" step="0.01" required name="sellingPrice" className="form-input" value={formData.sellingPrice} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">MRP (List Price)</label>
                      <input type="number" step="0.01" name="mrp" className="form-input" value={formData.mrp} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Purchase Price (Internal)</label>
                      <input type="number" step="0.01" name="purchasePrice" className="form-input" value={formData.purchasePrice} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Sale Discount (% or Fixed)</label>
                      <input name="saleDiscount" className="form-input" value={formData.saleDiscount} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group mb-0">
                      <label className="form-label">Tax Rate (%)</label>
                      <input type="number" name="taxRate" className="form-input" value={formData.taxRate} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Tiered Pricing (Wholesale)</label>
                      <input name="tieredPricing" className="form-input" value={formData.tieredPricing} onChange={handleChange} placeholder="e.g. 10+ qty @ 10% off" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="flex flex-col gap-5 animation-fade-in">
                  <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', marginTop: 0 }}>3. Inventory & Logistics</h3>
                  <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group mb-0">
                      <label className="form-label">SKU (Stock Keeping Unit)</label>
                      <input name="sku" className="form-input" value={formData.sku} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Barcode / GTIN</label>
                      <input name="barcodeStr" className="form-input" value={formData.barcodeStr} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group mb-0">
                      <label className="form-label">Unit of Measure</label>
                      <input name="unit" className="form-input" value={formData.unit} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Available Stock</label>
                      <input type="number" name="openingStock" className="form-input" value={formData.openingStock} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Low Stock Alert</label>
                      <input type="number" name="lowStockAlert" className="form-input" value={formData.lowStockAlert} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">Warehouse Location / Bin</label>
                    <input name="warehouseLocation" className="form-input" value={formData.warehouseLocation} onChange={handleChange} placeholder="e.g. Aisle 4, Shelf 2" />
                  </div>
                </div>
              )}

              {activeTab === 'specs' && (
                <div className="flex flex-col gap-5 animation-fade-in">
                  <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', marginTop: 0 }}>4. Specs & Variants</h3>
                  <div className="form-group mb-0">
                    <label className="form-label">Variants</label>
                    <input name="variants" className="form-input" value={formData.variants} onChange={handleChange} placeholder="e.g. Red, Blue, Large, Medium" />
                  </div>
                  <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group mb-0">
                      <label className="form-label">Physical Dimensions (LxWxH)</label>
                      <input name="dimensions" className="form-input" value={formData.dimensions} onChange={handleChange} placeholder="e.g. 10x5x2 cm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Weight</label>
                      <input name="weight" className="form-input" value={formData.weight} onChange={handleChange} placeholder="e.g. 500g" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group mb-0">
                      <label className="form-label">Material / Ingredients</label>
                      <input name="material" className="form-input" value={formData.material} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Country of Origin</label>
                      <input name="countryOfOrigin" className="form-input" value={formData.countryOfOrigin} onChange={handleChange} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'media' && (
                <div className="flex flex-col gap-10 animation-fade-in" style={{ paddingBottom: '2rem' }}>
                  <style>{`
                    .media-upload-box {
                      transition: all 0.2s ease;
                    }
                    .media-upload-box:hover {
                      border-color: #3b82f6 !important;
                      background-color: #eff6ff !important;
                      transform: translateY(-2px);
                      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
                    }
                    .media-section-title {
                      font-size: 1rem;
                      font-weight: 700;
                      color: #0f172a;
                      margin-bottom: 1rem;
                      display: flex;
                      align-items: center;
                      gap: 0.5rem;
                    }
                    .media-or-divider {
                      display: flex;
                      align-items: center;
                      text-align: center;
                      color: #94a3b8;
                      font-size: 0.85rem;
                      font-weight: 600;
                      text-transform: uppercase;
                      letter-spacing: 0.05em;
                      margin: 1.5rem 0;
                    }
                    .media-or-divider::before, .media-or-divider::after {
                      content: '';
                      flex: 1;
                      border-bottom: 1px solid #e2e8f0;
                    }
                    .media-or-divider::before { margin-right: 1rem; }
                    .media-or-divider::after { margin-left: 1rem; }
                  `}</style>

                  <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem', marginTop: 0, fontSize: '1.25rem', fontWeight: 800 }}>5. Media & Assets</h3>

                  {/* Images Section */}
                  <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div className="media-section-title"><ImageIcon size={20} color="#3b82f6" /> Product Images</div>
                    <div style={{ display: 'flex', gap: '2.5rem' }}>
                      {/* Left: Main Image */}
                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Main Image</label>
                        <label className="media-upload-box" style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '260px', height: '260px', borderRadius: '16px',
                          border: '2px dashed #cbd5e1', background: '#f8fafc',
                          cursor: 'pointer', overflow: 'hidden', position: 'relative'
                        }}>
                          {formData.image ? (
                            <img src={formData.image} alt="Main" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ background: '#e0e7ff', padding: '1rem', borderRadius: '50%' }}>
                                <ImageIcon size={32} color="#4f46e5" />
                              </div>
                              <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>Click to Upload</span>
                            </div>
                          )}
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'mainImage')} />
                        </label>
                      </div>

                      {/* Right: Angle Images */}
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gallery / Angle Images</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '340px' }}>
                          {Array.from({ length: 9 }).map((_, i) => {
                            const url = formData.gallery && formData.gallery[i] ? formData.gallery[i] : '';
                            return (
                              <label key={i} className="media-upload-box" style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                aspectRatio: '1/1', borderRadius: '12px',
                                border: '2px dashed #cbd5e1', background: '#f8fafc',
                                cursor: 'pointer', overflow: 'hidden', position: 'relative'
                              }}>
                                {url ? (
                                  <img src={url} alt={`Gallery ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <ImageIcon size={20} color="#cbd5e1" />
                                )}
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'gallery', i)} />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="media-or-divider">Or Paste External Image URLs</div>
                    <div>
                      <textarea className="form-input" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }} rows="2" placeholder="https://domain.com/img1.jpg, https://domain.com/img2.jpg..." value={Array.isArray(formData.gallery) ? formData.gallery.join(', ') : formData.gallery} onChange={e => setFormData({ ...formData, gallery: e.target.value.split(',').map(s => s.trim()) })}></textarea>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Separate multiple URLs with a comma.</p>
                    </div>
                  </div>

                  <hr style={{ borderTop: '1px solid #e2e8f0', borderBottom: 'none' }} />

                  {/* Video Section */}
                  <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div className="media-section-title"><Video size={20} color="#ef4444" /> Product Video</div>
                    <label className="media-upload-box" style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: '160px', borderRadius: '12px',
                      border: '2px dashed #cbd5e1', background: '#f8fafc',
                      cursor: 'pointer', overflow: 'hidden', position: 'relative'
                    }}>
                      {formData.videos && formData.videos[0] ? (
                        <div style={{ width: '100%', height: '100%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Video size={48} color="#ef4444" />
                          <div style={{ position: 'absolute', bottom: 12, right: 12, background: '#10b981', color: 'white', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '20px', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>Video Uploaded Successfully</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '50%' }}>
                            <Video size={32} color="#ef4444" />
                          </div>
                          <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>Click to Upload Video File</span>
                        </div>
                      )}
                      <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'videos', 0)} />
                    </label>

                    <div className="media-or-divider">Or Paste Video Links</div>
                    <div>
                      <textarea
                        className="form-input"
                        rows="2"
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}
                        placeholder="https://youtube.com/watch?v=..., https://vimeo.com/..."
                        value={Array.isArray(formData.videos) ? formData.videos.join(', ') : formData.videos}
                        onChange={(e) => setFormData({ ...formData, videos: e.target.value.split(',').map(s => s.trim()) })}
                      ></textarea>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Separate multiple YouTube/Vimeo URLs with a comma.</p>
                    </div>
                  </div>

                  <hr style={{ borderTop: '1px solid #e2e8f0', borderBottom: 'none' }} />

                  {/* Document Section */}
                  <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div className="media-section-title"><FileDown size={20} color="#10b981" /> Downloadable Documents</div>
                    <label className="media-upload-box" style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: '160px', borderRadius: '12px',
                      border: '2px dashed #cbd5e1', background: '#f8fafc',
                      cursor: 'pointer', overflow: 'hidden', position: 'relative'
                    }}>
                      {formData.files && formData.files[0] ? (
                        <div style={{ width: '100%', height: '100%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileDown size={48} color="#10b981" />
                          <div style={{ position: 'absolute', bottom: 12, right: 12, background: '#10b981', color: 'white', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '20px', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>Document Uploaded Successfully</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ background: '#d1fae5', padding: '1rem', borderRadius: '50%' }}>
                            <FileDown size={32} color="#10b981" />
                          </div>
                          <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>Click to Upload Datasheet / Manual (PDF)</span>
                        </div>
                      )}
                      <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'files', 0)} />
                    </label>

                    <div className="media-or-divider">Or Paste Document Links</div>
                    <div>
                      <textarea
                        className="form-input"
                        rows="2"
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}
                        placeholder="Link to PDF manual..."
                        value={Array.isArray(formData.files) ? formData.files.join(', ') : formData.files}
                        onChange={(e) => setFormData({ ...formData, files: e.target.value.split(',').map(s => s.trim()) })}
                      ></textarea>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Separate multiple document links with a comma.</p>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === 'seo' && (
                <div className="flex flex-col gap-5 animation-fade-in">
                  <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', marginTop: 0 }}>6. Marketing & SEO</h3>
                  <div className="form-group mb-0">
                    <label className="form-label">SEO Meta Title</label>
                    <input name="metaTitle" className="form-input" value={formData.metaTitle} onChange={handleChange} placeholder="Max 60 characters..." />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">Meta Description</label>
                    <textarea name="metaDescription" className="form-input" rows="2" value={formData.metaDescription} onChange={handleChange} placeholder="Snippet for search results (max 160 characters)..."></textarea>
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">URL Slug</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ padding: '0.625rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '8px 0 0 8px', color: '#64748b' }}>/product/</span>
                      <input name="urlSlug" className="form-input" style={{ borderRadius: '0 8px 8px 0' }} value={formData.urlSlug} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group mb-0">
                      <label className="form-label">Product Tags</label>
                      <input name="productTags" className="form-input" value={formData.productTags} onChange={handleChange} placeholder="comma, separated, tags" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Related / Cross-sell Products</label>
                      <input name="crossSellProducts" className="form-input" value={formData.crossSellProducts} onChange={handleChange} placeholder="IDs or names..." />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'trust' && (
                <div className="flex flex-col gap-5 animation-fade-in">
                  <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', marginTop: 0 }}>7. Customer Trust</h3>
                  <div className="form-group mb-0">
                    <label className="form-label">Warranty Information</label>
                    <textarea name="warrantyInfo" className="form-input" rows="2" value={formData.warrantyInfo} onChange={handleChange} placeholder="e.g. 1 Year Manufacturer Warranty..."></textarea>
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">Return Policy</label>
                    <textarea name="returnPolicy" className="form-input" rows="2" value={formData.returnPolicy} onChange={handleChange} placeholder="e.g. 7 Days Replacement..."></textarea>
                  </div>
                  <div className="form-group mb-0" style={{ opacity: 0.7 }}>
                    <label className="form-label">Customer Reviews & Q&A</label>
                    <div style={{ padding: '1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>Reviews and Questions will populate here automatically once customers interact with this product.</p>
                    </div>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>

        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            background: '#f8fafc'
          }}
        >
          {/* Left Side */}
          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>

          {/* Right Side */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            
            {currentTabIndex > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={goPrevious}
              >
                Previous
              </button>
            )}

            {currentTabIndex < tabs.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={goNext}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0.5rem 1.5rem'
                }}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePublish}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0.5rem 1.5rem'
                }}
              >
                <CheckCircle size={18} />
                Confirm Publish to Store
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StorePublishModal;
