import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { addItem, updateItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { X, Package, Briefcase, Camera, Barcode as BarcodeIcon } from 'lucide-react';
import Barcode from 'react-barcode';

const UNITS = ['Pieces (PCS)', 'Numbers (NOS)', 'Kilograms (KGS)', 'Grams (GMS)', 'Meters (MTR)', 'Centimeters (CMS)', 'Liters (LTR)', 'Milliliters (MLT)', 'Boxes (BOX)', 'Packets (PAC)', 'Dozens (DZN)', 'Rolls (ROL)', 'Tons (TON)'];
const TAX_RATES = ['0', '5', '12', '18', '28'];
const INVENTORY_TYPES = ['Normal', 'Batch-wise', 'Serial Number-wise'];
const PRODUCT_GROUPS = ['Electronics', 'FMCG', 'Apparel', 'Services', 'Furniture', 'Hardware', 'Software', 'Others'];

const ProductModal = ({ isOpen, onClose, onSave, editingId = null, initialData = null }) => {
  const { user } = useAuth();
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

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        itemType: initialData.itemType || 'product',
        name: initialData.name || '',
        description: initialData.description || '',
        hsn: initialData.hsn || '',
        unit: initialData.unit || 'Pieces (PCS)',
        purchasePrice: initialData.purchasePrice || '',
        sellingPrice: initialData.sellingPrice || '',
        taxRate: String(initialData.taxRate || '18'),
        cessPercent: String(initialData.cessPercent || '0'),
        cessAmount: String(initialData.cessAmount || '0'),
        mrp: initialData.mrp || '',
        saleDiscount: String(initialData.saleDiscount || '0'),
        inventoryType: initialData.inventoryType || 'Normal',
        openingStock: String(initialData.stock || '0'),
        lowStockAlert: String(initialData.lowStockAlert || '5'),
        productGroup: initialData.productGroup || 'Others',
        batch: initialData.batch || '',
        expiry: initialData.expiry || '',
        barcodeStr: initialData.barcodeStr || '',
        image: initialData.image || null
      });
    } else {
      setFormData({
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
    }
  }, [initialData, isOpen]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      const barcodeVal = formData.barcodeStr || (formData.itemType === 'product' ? Date.now().toString().slice(-10) : '');
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
        barcodeStr: barcodeVal
      };

      let result;
      if (editingId) {
        result = await updateItem('products', editingId, itemData, user.id);
      } else {
        result = await addItem('products', itemData, user.id);
      }

      if (result) {
        onSave(result);
        onClose();
      }
    } catch (err) {
      console.error('Failed to save item:', err);
      alert('Failed to save product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={{ 
      position: 'fixed', 
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 9999, 
      padding: '20px',
      paddingLeft: '270px' // Offset by sidebar (250px) + some extra margin
    }}>
      <div className="glass" style={{ 
        padding: '2.5rem', 
        width: '900px', 
        maxWidth: '100%', 
        background: 'white', 
        maxHeight: '90vh', 
        overflowY: 'auto', 
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        borderRadius: '16px'
      }}>
        <button 
           type="button" 
           onClick={onClose} 
           style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
        >
          <X size={18} />
        </button>

        <div className="flex justify-between items-center mb-6">
          <h2 style={{ margin: 0, fontWeight: 800 }}>{editingId ? (formData.itemType === 'product' ? 'Edit Product' : 'Edit Service') : (formData.itemType === 'product' ? 'Add New Product' : 'Add New Service')}</h2>
          <div className="flex bg-slate-100 p-1 rounded-lg" style={{ background: '#f1f5f9', borderRadius: '8px', padding: '4px', marginRight: '3rem' }}>
            <button 
              type="button" 
              className={`btn btn-sm ${formData.itemType === 'product' ? 'btn-primary' : ''}`} 
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 16px', fontSize: '0.875rem', background: formData.itemType === 'product' ? 'var(--primary-color)' : 'transparent', color: formData.itemType === 'product' ? 'white' : 'var(--text-secondary)', border: 'none' }}
              onClick={() => setFormData({...formData, itemType: 'product'})}
            >
              <Package size={16} /> Product
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${formData.itemType === 'service' ? 'btn-primary' : ''}`} 
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 16px', fontSize: '0.875rem', background: formData.itemType === 'service' ? 'var(--primary-color)' : 'transparent', color: formData.itemType === 'service' ? 'white' : 'var(--text-secondary)', border: 'none' }}
              onClick={() => setFormData({...formData, itemType: 'service'})}
            >
              <Briefcase size={16} /> Service
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="inventory-form">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 250px', gap: '2rem' }}>
            {/* Left Side: Fields */}
            <div className="flex flex-col gap-6">
               <section>
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', fontWeight: 700 }}>Basic Information</h4>
                  <div className="flex flex-col gap-4">
                    <div className="form-group mb-0">
                      <label className="form-label">{formData.itemType === 'product' ? 'Product' : 'Service'} Name *</label>
                      <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={`Enter ${formData.itemType} name`} />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">{formData.itemType === 'product' ? 'Product' : 'Service'} Description / Notes</label>
                      <textarea className="form-input" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder={`Additional Details about this ${formData.itemType}`}></textarea>
                    </div>
                    <div className="flex gap-4">
                       <div className="form-group w-full mb-0">
                         <label className="form-label">{formData.itemType === 'product' ? 'HSN Code' : 'SAC Code'}</label>
                         <input className="form-input" value={formData.hsn} onChange={e => setFormData({...formData, hsn: e.target.value})} />
                       </div>
                       <div className="form-group w-full mb-0">
                         <label className="form-label">Product Group</label>
                         <select className="form-input" value={formData.productGroup} onChange={e => setFormData({...formData, productGroup: e.target.value})}>
                            {PRODUCT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                         </select>
                       </div>
                    </div>
                  </div>
               </section>

               <section>
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', fontWeight: 700 }}>Pricing & Tax</h4>
                  <div className="flex flex-col gap-4">
                     <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group mb-0">
                          <label className="form-label">Selling Price *</label>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ padding: '0.625rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '8px 0 0 8px', fontSize: '0.9rem' }}>₹</span>
                            <input type="number" step="0.01" required className="form-input" style={{ borderRadius: '0 8px 8px 0' }} value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} />
                          </div>
                        </div>
                        <div className="form-group mb-0">
                          <label className="form-label">Purchase Price</label>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ padding: '0.625rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '8px 0 0 8px', fontSize: '0.9rem' }}>₹</span>
                            <input type="number" step="0.01" className="form-input" style={{ borderRadius: '0 8px 8px 0' }} value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} />
                          </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group mb-0">
                          <label className="form-label">MRP (Max Retail Price)</label>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ padding: '0.625rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '8px 0 0 8px', fontSize: '0.9rem' }}>₹</span>
                            <input type="number" step="0.01" className="form-input" style={{ borderRadius: '0 8px 8px 0' }} value={formData.mrp} onChange={e => setFormData({...formData, mrp: Number(e.target.value)})} />
                          </div>
                        </div>
                        <div className="form-group mb-0">
                          <label className="form-label">Sale Discount (%)</label>
                          <input type="number" className="form-input" value={formData.saleDiscount} onChange={e => setFormData({...formData, saleDiscount: Number(e.target.value)})} />
                        </div>
                     </div>
                     <div className="grid grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group mb-0">
                          <label className="form-label">Tax Rate (%)</label>
                          <select className="form-input" value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: e.target.value})}>
                            {TAX_RATES.map(r => <option key={r} value={r}>{r}% GST</option>)}
                          </select>
                        </div>
                        <div className="form-group mb-0">
                          <label className="form-label">CESS (%)</label>
                          <input type="number" className="form-input" value={formData.cessPercent} onChange={e => setFormData({...formData, cessPercent: Number(e.target.value)})} />
                        </div>
                        <div className="form-group mb-0">
                          <label className="form-label">Total Tax Amount</label>
                          <input className="form-input" style={{ background: '#f8fafc' }} value={`₹${((Number(formData.sellingPrice) * Number(formData.taxRate)) / 100).toFixed(2)}`} disabled />
                        </div>
                     </div>
                  </div>
               </section>

               {formData.itemType === 'product' && (
                 <section>
                    <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', fontWeight: 700 }}>Inventory & Stock</h4>
                    <div className="flex flex-col gap-4">
                       <div className="grid grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                          <div className="form-group mb-0">
                            <label className="form-label">Inventory Tracking</label>
                            <select className="form-input" value={formData.inventoryType} onChange={e => setFormData({...formData, inventoryType: e.target.value})}>
                              {INVENTORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="form-group mb-0">
                            <label className="form-label">UOM (Unit)</label>
                            <select className="form-input" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                          <div className="form-group mb-0">
                            <label className="form-label">Barcode / SKU</label>
                            <input className="form-input" value={formData.barcodeStr} onChange={e => setFormData({...formData, barcodeStr: e.target.value})} placeholder="Scan or Type" />
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="form-group mb-0">
                            <label className="form-label">Opening Stock (Available)</label>
                            <input type="number" required className="form-input" value={formData.openingStock} onChange={e => setFormData({...formData, openingStock: Number(e.target.value)})} />
                          </div>
                          <div className="form-group mb-0">
                            <label className="form-label">Low Stock Alert Level</label>
                            <input type="number" className="form-input" value={formData.lowStockAlert} onChange={e => setFormData({...formData, lowStockAlert: Number(e.target.value)})} />
                          </div>
                       </div>
                       {formData.inventoryType === 'Batch-wise' && (
                          <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group mb-0">
                              <label className="form-label">Batch Number</label>
                              <input className="form-input" value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} />
                            </div>
                            <div className="form-group mb-0">
                              <label className="form-label">Expiry Date</label>
                              <input type="month" className="form-input" value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} />
                            </div>
                          </div>
                       )}
                    </div>
                 </section>
               )}
            </div>

            {/* Right Side: Media */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
               <div style={{ 
                  width: '100%', 
                  aspectRatio: '1', 
                  background: '#f8fafc', 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative'
               }}>
                  {formData.image ? (
                    <>
                      <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', zIndex: 10 }}
                        onClick={() => setFormData({...formData, image: null})}
                      >
                         &times;
                      </button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                      <Camera size={40} style={{ marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Click or Drag Image</div>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
               </div>
               
               {formData.itemType === 'product' && (
                  <div className="glass p-4" style={{ background: '#f8fafc', borderRadius: '12px' }}>
                     <div style={{ fontSize: '0.75rem', fontWeights: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '1rem' }}>Quick Summary</div>
                     <div className="flex flex-col gap-3">
                        <div className="flex justify-between">
                           <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Stock Value:</span>
                           <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>₹{(Number(formData.openingStock) * Number(formData.sellingPrice)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                           <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Est. Margin:</span>
                           <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#10b981' }}>{formData.purchasePrice > 0 ? `${(((formData.sellingPrice - formData.purchasePrice)/formData.purchasePrice)*100).toFixed(1)}%` : 'N/A' }</span>
                        </div>
                     </div>
                  </div>
               )}

               {formData.barcodeStr && (
                  <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center', textAlign: 'center' }}>
                     <Barcode value={formData.barcodeStr} width={1} height={40} fontSize={12} />
                  </div>
               )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-10" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 32px', background: 'var(--primary-color)', color: 'white' }} disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : (editingId ? 'Update Item' : 'Save and Select')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ProductModal;
