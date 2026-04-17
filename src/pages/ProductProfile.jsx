import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItems, updateItem, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import Barcode from 'react-barcode';
import {
  ArrowLeft, Package, Edit2, IndianRupee, Archive, TrendingUp, Hash, Layers, Tag, AlignLeft,
  Percent, Shield, FileText, Store, Briefcase, Target, Trash2, Camera, Plus, Sliders, FilePlus,
  Box, Info, AlertTriangle, Settings, ChevronRight, Barcode as BarcodeIcon
} from 'lucide-react';
import './ProductProfile.css';

const UNITS = ['Pieces (PCS)', 'Numbers (NOS)', 'Kilograms (KGS)', 'Grams (GMS)', 'Meters (MTR)', 'Centimeters (CMS)', 'Liters (LTR)', 'Milliliters (MLT)', 'Boxes (BOX)', 'Packets (PAC)', 'Dozens (DZN)', 'Rolls (ROL)', 'Tons (TON)'];
const TAX_RATES = ['0', '5', '12', '18', '28'];
const INVENTORY_TYPES = ['Normal', 'Batch-wise', 'Serial Number-wise'];
const PRODUCT_GROUPS = ['Electronics', 'FMCG', 'Apparel', 'Services', 'Furniture', 'Hardware', 'Software', 'Others'];

const InfoItem = ({ icon: Icon, colorClass = "blue", label, value, chip }) => (
  <div className="pp-info-item">
    <div className={`pp-info-icon ${colorClass}`}><Icon size={16} /></div>
    <div className="pp-info-text">
      <div className="pp-info-label">{label}</div>
      {chip ? chip : (
        <div className="pp-info-value">{value || 'Not provided'}</div>
      )}
    </div>
  </div>
);

const Card = ({ icon: Icon, title, children }) => (
  <div className="pp-card">
    <div className="pp-card-header">
      <div className="pp-card-header-icon"><Icon size={14} /></div>
      <div className="pp-card-title">{title}</div>
    </div>
    <div className="pp-card-content">
      {children}
    </div>
  </div>
);

const ProductProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal & Form States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    itemType: 'product',
    name: '',
    description: '',
    hsn: '',
    unit: 'Pieces (PCS)',
    purchasePrice: '',
    sellingPrice: '',
    taxRate: '18',
    cessPercent: '0',
    cessAmount: '0',
    mrp: '',
    saleDiscount: '0',
    inventoryType: 'Normal',
    openingStock: '0',
    lowStockAlert: '5',
    productGroup: 'Others',
    batch: '',
    expiry: '',
    barcodeStr: '',
    image: null
  });

  const loadData = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    try {
      const products = await getItems('products', user.id);
      const item = products.find(p => (p._dbId === id || p.id === id));
      setProduct(item || null);
    } catch (err) {
      console.error('Failed to load product profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEditClick = () => {
    if (!product) return;
    setFormData({
      itemType: product.itemType || 'product',
      name: product.name || '',
      description: product.description || '',
      hsn: product.hsn || '',
      unit: product.unit || 'Pieces (PCS)',
      purchasePrice: product.purchasePrice || '',
      sellingPrice: product.sellingPrice || '',
      taxRate: String(product.taxRate || '18'),
      cessPercent: String(product.cessPercent || '0'),
      cessAmount: String(product.cessAmount || '0'),
      mrp: product.mrp || '',
      saleDiscount: String(product.saleDiscount || '0'),
      inventoryType: product.inventoryType || 'Normal',
      openingStock: String(product.stock || '0'),
      lowStockAlert: String(product.lowStockAlert || '5'),
      productGroup: product.productGroup || 'Others',
      batch: product.batch || '',
      expiry: product.expiry || '',
      barcodeStr: product.barcodeStr || '',
      image: product.image || null
    });
    setIsEditModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, image: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id || !product) return;

    setIsSubmitting(true);
    try {
      const itemData = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        taxRate: Number(formData.taxRate) || 0,
        stock: Number(formData.openingStock) || 0,
        lowStockAlert: Number(formData.lowStockAlert) || 5,
        mrp: Number(formData.mrp) || 0,
        saleDiscount: Number(formData.saleDiscount) || 0,
        cessPercent: Number(formData.cessPercent) || 0,
        cessAmount: Number(formData.cessAmount) || 0,
      };

      const result = await updateItem('products', product._dbId || product.id, itemData, user.id, user.name);
      if (result) {
        setIsEditModalOpen(false);
        await loadData(); // Refresh view
      }
    } catch (err) {
      console.error('Failed to update item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) return;
    
    try {
      const success = await deleteItem('products', product._dbId || product.id, user.id, user.name);
      if (success) {
        navigate('/products');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (loading) {
    return <div className="pp-page"><div className="pp-content" style={{textAlign:'center', marginTop:'3rem'}}>Loading...</div></div>;
  }
  if (!product) {
    return <div className="pp-page"><div className="pp-content" style={{textAlign:'center', marginTop:'3rem'}}>Item Not Found</div></div>;
  }

  const isProduct = product.itemType === 'product';
  const name = product.name || 'Unknown Item';
  const price = Number(product.sellingPrice || 0);
  const purchase = Number(product.purchasePrice || 0);
  const stock = Number(product.stock || 0);
  
  const marginAmt = price - purchase;
  const marginPct = purchase > 0 ? ((marginAmt / purchase) * 100).toFixed(1) : 0;

  return (
    <div className="pp-outer-card">
      <div className="pp-page">
        <div className="pp-content">
          
          {/* Hero Header Overhaul */}
          <div className="pp-hero">
            <div className="pp-hero-left">
              <div className="pp-hero-avatar">
                {product.image ? <img src={product.image} alt={name} /> : 
                  (isProduct ? <Package size={48} color="#2f44c4" /> : <Briefcase size={48} color="#2f44c4" />)}
              </div>
              <div className="pp-hero-info">
                <h1 className="pp-hero-name">{name}</h1>
                <div className="pp-hero-chips">
                  <span className="pp-chip product"><Tag size={10}/> {isProduct ? 'Product' : 'Service'}</span>
                  <span className="pp-chip group"><Layers size={10}/> {product.productGroup || 'FMCG'}</span>
                  {isProduct && <span className="pp-chip ok"><Archive size={10}/> IN STOCK</span>}
                </div>
                <div className="pp-hero-desc">
                  <Tag size={12} /> HSN Code: {product.hsn || '23343'}
                </div>
              </div>
            </div>
            <div className="pp-hero-actions">
              <button className="pp-btn hero-edit" onClick={handleEditClick}>
                <Edit2 size={13} /> Edit Item
              </button>
              <div style={{ marginTop: '0.75rem' }}>
                <button className="pp-back-btn" onClick={() => navigate('/products')}>
                  <ArrowLeft size={14} /> Back
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="pp-stats">
            <div className="pp-stat price">
              <IndianRupee size={150} className="pp-stat-bg-icon" />
              <div className="pp-stat-top">
                <div className="pp-stat-icon"><IndianRupee size={14} /></div>
                <div className="pp-stat-label">Selling Price</div>
              </div>
              <div className="pp-stat-value">₹{price.toLocaleString()}</div>
              <div className="pp-stat-sub">Applicable Tax: {product.taxRate || 0}%</div>
            </div>

            <div className="pp-stat stock">
              <Archive size={150} className="pp-stat-bg-icon" />
              <div className="pp-stat-top">
                <div className="pp-stat-icon"><Archive size={14} /></div>
                <div className="pp-stat-label">Current Stock</div>
              </div>
              <div className="pp-stat-value">{isProduct ? stock : 'N/A'}</div>
              <div className="pp-stat-sub">Base Unit: {product.unit?.split(' ')[0] || 'Units'}</div>
            </div>

            <div className="pp-stat margin">
              <TrendingUp size={150} className="pp-stat-bg-icon" />
              <div className="pp-stat-top">
                <div className="pp-stat-icon"><TrendingUp size={14} /></div>
                <div className="pp-stat-label">Est. Profit Margin</div>
              </div>
              <div className="pp-stat-value">{marginPct}%</div>
              <div className="pp-stat-sub">Gross margin over purchase price</div>
            </div>
          </div>

          {/* Information Sections (Full Width) */}
          <div className="pp-body">
            <Card icon={Store} title="Basic Information">
              <div className="pp-info-grid">
                <InfoItem icon={Package} label="Item Name" value={name} />
                <InfoItem icon={Hash} label="Item ID (Database)" value={product.id || product._dbId || 'N/A'} />
                <InfoItem icon={Box} label="Classification" value={isProduct ? 'Product' : 'Service'} />
                <InfoItem icon={Layers} label="Product Group" value={product.productGroup || '-'} />
                <InfoItem icon={Target} colorClass="purple" label="HSN/SAC Code" value={product.hsn || '-'} />
                <InfoItem icon={AlignLeft} colorClass="slate" label="Description & Notes" value={product.description || '-'} />
              </div>
            </Card>

            <Card icon={IndianRupee} title="Pricing & Financial Details">
              <div className="pp-info-grid">
                <InfoItem icon={IndianRupee} colorClass="blue" label="Selling Price" value={`₹ ${price.toLocaleString()}`} />
                <InfoItem icon={IndianRupee} colorClass="cyan" label="Purchase Rate" value={`₹ ${purchase.toLocaleString()}`} />
                <InfoItem icon={IndianRupee} colorClass="blue" label="MRP (Retail)" value={product.mrp ? `₹ ${Number(product.mrp).toLocaleString()}` : '-'} />
                <InfoItem icon={Percent} colorClass="cyan" label="Discount (%)" value={product.saleDiscount ? `${product.saleDiscount}%` : '-'} />
                <InfoItem icon={Shield} colorClass="blue" label="Applicable GST Rate" value={`${product.taxRate || 0}%`} />
                <InfoItem icon={Percent} colorClass="cyan" label="CESS" value={product.cessPercent ? `${product.cessPercent}% / ₹${product.cessAmount}` : '-'} />
              </div>
            </Card>

            <Card icon={Archive} title="Inventory Settings">
              {isProduct ? (
                <div className="pp-info-grid">
                  <InfoItem icon={Archive} colorClass="green" label="Stock Tracking Type" value={product.inventoryType} />
                  <InfoItem icon={Tag} colorClass="slate" label="Batch / Lot Number" value={product.batch || '-'} />
                  <InfoItem icon={Layers} colorClass="green" label="Unit of Measurement" value={product.unit} />
                  <InfoItem icon={Info} colorClass="slate" label="Expiry Date" value={product.expiry || 'Not provided'} />
                  <InfoItem icon={AlertTriangle} colorClass="green" label="Low Stock Warning Level" value={`${product.lowStockAlert || 5} Units`} />
                  <InfoItem icon={BarcodeIcon} colorClass="slate" label="Product Barcode" chip={
                    product.barcodeStr ? (
                      <div className="pp-barcode-box">
                        <Barcode value={product.barcodeStr} height={30} width={1.2} fontSize={10} displayValue={true} background="transparent" margin={0} />
                      </div>
                    ) : <div className="pp-info-value">Not provided</div>
                  } />
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  <Briefcase size={32} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Services do not require inventory tracking.</div>
                </div>
              )}
            </Card>

            <Card icon={Settings} title="Product Operations">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button className="pp-op-item edit" onClick={handleEditClick}>
                  <div className="pp-op-icon skyblue"><Edit2 size={20} /></div>
                  <div className="pp-op-text">
                    <div className="pp-op-title">Edit Details</div>
                    <div className="pp-op-sub">Update product name, pricing, or tax details.</div>
                  </div>
                  <ChevronRight size={18} className="pp-op-arrow" />
                </button>

                <button className="pp-op-item delete" onClick={handleDelete}>
                  <div className="pp-op-icon red"><Trash2 size={20} /></div>
                  <div className="pp-op-text">
                    <div className="pp-op-title">Delete Item</div>
                    <div className="pp-op-sub">Permanently remove this product from inventory.</div>
                  </div>
                  <ChevronRight size={18} className="pp-op-arrow" />
                </button>
              </div>
            </Card>
          </div>

        </div>
      </div>

      {/* Integrated Edit Modal */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass" style={{ padding: '2.5rem', width: '900px', maxWidth: '100%', background: 'white', maxHeight: '95vh', overflowY: 'auto', borderRadius: '24px' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ margin: 0, color: '#1e293b' }}>{formData.itemType === 'product' ? 'Edit Product' : 'Edit Service'}</h2>
              <div className="flex bg-slate-100 p-1 rounded-lg" style={{ background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
                <button 
                  type="button" 
                  className={`btn btn-sm ${formData.itemType === 'product' ? 'btn-primary' : ''}`} 
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 16px', fontSize: '0.875rem', background: formData.itemType === 'product' ? '#2563eb' : 'transparent', color: formData.itemType === 'product' ? 'white' : '#64748b', border: 'none', borderRadius: '6px' }}
                  onClick={() => setFormData({...formData, itemType: 'product'})}
                >
                  <Package size={16} /> Product
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm ${formData.itemType === 'service' ? 'btn-primary' : ''}`} 
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 16px', fontSize: '0.875rem', background: formData.itemType === 'service' ? '#2563eb' : 'transparent', color: formData.itemType === 'service' ? 'white' : '#64748b', border: 'none', borderRadius: '6px' }}
                  onClick={() => setFormData({...formData, itemType: 'service'})}
                >
                  <Briefcase size={16} /> Service
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 250px', gap: '2rem' }}>
                <div className="flex flex-col gap-6">
                   <section>
                      <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Basic Information</h4>
                      <div className="flex flex-col gap-4">
                        <div className="form-group mb-0">
                          <label className="form-label">{formData.itemType === 'product' ? 'Product' : 'Service'} Name *</label>
                          <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={`Enter ${formData.itemType} name`} />
                        </div>
                        <div className="form-group mb-0">
                          <label className="form-label">Description / Notes</label>
                          <textarea className="form-input" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Additional Details"></textarea>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                           <div className="form-group mb-0" style={{ flex: 1 }}>
                             <label className="form-label">HSN/SAC Code</label>
                             <input className="form-input" value={formData.hsn} onChange={e => setFormData({...formData, hsn: e.target.value})} />
                           </div>
                           <div className="form-group mb-0" style={{ flex: 1 }}>
                             <label className="form-label">Product Group</label>
                             <select className="form-input" value={formData.productGroup} onChange={e => setFormData({...formData, productGroup: e.target.value})}>
                                {PRODUCT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                             </select>
                           </div>
                        </div>
                      </div>
                   </section>

                   <section>
                      <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Pricing & Tax</h4>
                      <div className="flex flex-col gap-4">
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group mb-0">
                              <label className="form-label">Selling Price *</label>
                              <input type="number" step="0.01" required className="form-input" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} />
                            </div>
                            <div className="form-group mb-0">
                              <label className="form-label">Purchase Price</label>
                              <input type="number" step="0.01" className="form-input" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} />
                            </div>
                         </div>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group mb-0">
                              <label className="form-label">Tax Rate (%)</label>
                              <select className="form-input" value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: e.target.value})}>
                                {TAX_RATES.map(r => <option key={r} value={r}>{r}% GST</option>)}
                              </select>
                            </div>
                            <div className="form-group mb-0">
                              <label className="form-label">CESS (%)</label>
                              <input type="number" className="form-input" value={formData.cessPercent} onChange={e => setFormData({...formData, cessPercent: e.target.value})} />
                            </div>
                         </div>
                      </div>
                   </section>

                   {formData.itemType === 'product' && (
                     <section>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Inventory & Stock</h4>
                        <div className="flex flex-col gap-4">
                           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div className="form-group mb-0">
                                <label className="form-label">UOM (Unit)</label>
                                <select className="form-input" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </div>
                              <div className="form-group mb-0">
                                <label className="form-label">Current Stock</label>
                                <input type="number" className="form-input" value={formData.openingStock} onChange={e => setFormData({...formData, openingStock: e.target.value})} />
                              </div>
                           </div>
                        </div>
                     </section>
                   )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                   <div style={{ width: '100%', aspectRatio: '1', background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                      {formData.image ? (
                        <>
                          <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" style={{ position: 'absolute', top: '8px', right: '8px', background: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }} onClick={() => setFormData({...formData, image: null})}>&times;</button>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                          <Camera size={32} />
                          <div style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>Update Image</div>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={handleImageChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                   </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-10" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 24px' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductProfile;
