import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Store, ShoppingBag, Eye, Share2, QrCode, Printer, Check, Copy, ExternalLink, 
  Sparkles, Search, Filter, TrendingUp, Package, Users, MessageCircle, FileText, 
  Settings, ArrowUpRight, Flame, Star, Award, ShieldCheck, Truck, RefreshCw, 
  Download, Clock, ChevronRight, AlertCircle, Edit3, Lock, CheckCircle2, Percent, 
  Tag, DollarSign, MapPin, Phone, Mail, Building, HelpCircle, Image, Palette, 
  Calendar, RotateCcw, CreditCard, ChevronDown, CheckSquare, Square,
  Monitor, Tablet, Smartphone, Plus, Trash2, X, FileCheck2, UserCheck, EyeOff, Upload
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getDB, getItems, updateItem, addItem, deleteItem } from '@/utils/db';
import { QRCodeSVG } from 'qrcode.react';
import QRStandeeModal from '@/features/catalog/components/QRStandeeModal';
import '@/features/catalog/styles/DigitalCatalogAdmin.css';

const DEFAULT_REAL_PRODUCTS = [
  {
    id: 'prod-scanner-2d',
    name: 'Pro Wireless 2D High-Speed QR & Barcode Scanner',
    description: 'Industrial-grade wireless optical barcode reader with 32-bit ARM decoder, 30-meter Bluetooth 5.2 range, and shockproof drop-resistant housing. Designed for superfast retail checkout counters and warehouse logistics.',
    sellingPrice: 2499,
    mrp: 3999,
    stock: 24,
    unit: 'Pieces (PCS)',
    hsn: '8471',
    taxRate: 18,
    productGroup: 'Electronics & Hardware',
    catalogBadge: 'bestseller',
    brand: 'Apex Tech',
    isPublished: true,
    image: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'prod-printer-thermal',
    name: 'Thermal Billing Receipt Printer 80mm (Auto-Cutter, USB + LAN + Bluetooth)',
    description: 'Ultra-fast 260mm/sec thermal POS receipt printer compatible with all billing software, Android POS apps, and desktop computers. Features sharp japanese print head and auto paper cutter.',
    sellingPrice: 3850,
    mrp: 5500,
    stock: 16,
    unit: 'Pieces (PCS)',
    hsn: '8443',
    taxRate: 18,
    productGroup: 'POS & Billing Hardware',
    catalogBadge: 'hot',
    brand: 'PosMaster',
    isPublished: true,
    image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'prod-cash-drawer',
    name: 'Heavy-Duty Electronic Cash Drawer (5 Bill / 8 Coin Trays, RJ11)',
    description: 'Solid cold-rolled steel construction with 3-position key lock and RJ11 printer trigger cable. Built for commercial superstore cash counters with 1,000,000+ open cycle lifespan.',
    sellingPrice: 2199,
    mrp: 3200,
    stock: 12,
    unit: 'Pieces (PCS)',
    hsn: '8303',
    taxRate: 18,
    productGroup: 'POS & Billing Hardware',
    catalogBadge: 'featured',
    brand: 'SafeVault',
    isPublished: true,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'prod-labels-rolls',
    name: 'Premium Waterproof Barcode Labels (50mm x 25mm, 2000 Rolls)',
    description: 'High-adhesion thermal transfer sticky labels for retail pricing, barcode printing, and warehouse carton inventory tagging. Smudge-proof and oil resistant.',
    sellingPrice: 420,
    mrp: 650,
    stock: 85,
    unit: 'Rolls (ROL)',
    hsn: '4821',
    taxRate: 12,
    productGroup: 'Packaging & Labels',
    catalogBadge: 'new',
    brand: 'StickPro',
    isPublished: true,
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'prod-weighing-scale',
    name: 'High-Precision Commercial Digital Weighing Scale (30Kg Capacity, Double LED)',
    description: 'Govt legal metrology approved electronic retail counter scale. Features dual front & back LED weight/price display, rechargeable battery backup, and tare counting.',
    sellingPrice: 1890,
    mrp: 2800,
    stock: 14,
    unit: 'Pieces (PCS)',
    hsn: '8423',
    taxRate: 18,
    productGroup: 'Retail Store Equipment',
    catalogBadge: 'bestseller',
    brand: 'GramTech',
    isPublished: true,
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'prod-paper-rolls',
    name: 'BPA-Free Thermal Billing Paper Rolls 3-Inch (Pack of 50 Rolls, 65 GSM)',
    description: 'High-density ultra-white thermal receipt paper with 5-year image preservation. Lint-free paper protects printer heads from wear and tear.',
    sellingPrice: 750,
    mrp: 1100,
    stock: 45,
    unit: 'Packs (PAC)',
    hsn: '4811',
    taxRate: 12,
    productGroup: 'Packaging & Labels',
    catalogBadge: 'hot',
    brand: 'PrintClean',
    isPublished: true,
    image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80'
    ]
  }
];

const CURATED_IMAGE_PRESETS = [
  { label: 'Barcode Scanner', url: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80' },
  { label: 'Thermal Printer', url: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&auto=format&fit=crop&q=80' },
  { label: 'Cash Drawer', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80' },
  { label: 'Barcode Labels', url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80' },
  { label: 'Weighing Scale', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80' },
];
// Client-side fast image compressor to keep local storage light and responsive
const compressImageFile = (file, maxWidth, maxHeight, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(format, quality);
        resolve(dataUrl);
      };
      img.onerror = (e) => reject(e);
      img.src = event.target.result;
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
};

const DigitalCatalogAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const company = getDB()?.company || {};

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'products' | 'orders' | 'preview' | 'settings' | 'marketing'
  const [settingsSection, setSettingsSection] = useState('template'); // 'template' | 'identity' | 'contact' | 'location' | 'compliance' | 'shipping' | 'payments' | 'promotions' | 'status'

  // Products & Orders State
  const [products, setProducts] = useState([]);
  const [catalogOrders, setCatalogOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all | published | hidden
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Preview Controls
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [previewPage, setPreviewPage] = useState('storefront'); // 'storefront' | 'pdp'

  // Orders Filter & Details
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Product Modals
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    description: '',
    sellingPrice: '',
    mrp: '',
    stock: 15,
    unit: 'Pieces (PCS)',
    hsn: '8471',
    taxRate: 18,
    productGroup: 'Electronics & Hardware',
    catalogBadge: 'new',
    brand: '',
    image: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80',
    isPublished: true
  });

  // Modals & Popups
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Store Configuration with Extended Comprehensive Settings
  const [storeConfig, setStoreConfig] = useState(() => {
    const saved = localStorage.getItem(`gogstbill_catalog_config_${user?.id || 'default'}`);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (!parsed.template || parsed.template === 'amazon') parsed.template = 'flagship';
        return parsed;
      } catch (e) {}
    }
    return {
      // 1. Template & Theme
      template: 'flagship', // 'flagship' | 'wholesale' | 'boutique' | 'neo-tech' | 'express-mart'
      themePreset: 'cyber',
      brandColor: '#0284c7',

      // 2. Identity & Media
      storeName: company.name || (user?.firstName ? `${user.firstName}'s Store` : 'My Digital Store'),
      tagline: 'Wholesale & Retail Best Quality Products at Direct Factory Prices',
      description: 'Welcome to our official digital catalog. Browse our live inventory, verified rates, and place orders directly on WhatsApp with full GST tax invoice.',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f156d?w=1600&auto=format&fit=crop&q=80',
      establishedYear: '2022',
      slug: (company.name || user?.username || 'store').toLowerCase().replace(/[^a-z0-9]/g, '-'),

      // 3. Contact & WhatsApp Ordering
      phone: company.phone || user?.phone || '9876543210',
      whatsappNumber: company.phone || user?.phone || '9876543210',
      whatsappWelcomeMsg: 'Hello! I am placing an order from your digital storefront catalog.',
      email: user?.email || 'sales@commercialstore.com',
      contactPerson: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Store Manager',

      // 4. Showroom & Physical Location
      address: company.address || 'Shop No. 14, Commercial Market Complex, Main Boulevard',
      city: company.state || 'Mumbai',
      state: company.state || 'Maharashtra',
      pincode: '400001',
      mapLink: 'https://maps.google.com',
      operatingHours: 'Mon - Sat: 9:30 AM to 8:30 PM (Sunday Closed)',

      // 5. GST, Legal & Compliance
      legalName: company.name || 'Enterprise Commercial Pvt Ltd',
      gstin: company.gstin || '27AABCU9603R1ZM',
      panNumber: 'AABCU9603R',
      msmeNumber: 'UDYAM-MH-01-0089123',
      showGstBreakdown: true,
      showGstBadge: true,
      returnPolicy: '7-Day replacement guarantee on manufacturing defects with original packing.',

      // 6. Shipping & Delivery
      minOrderValue: '299',
      freeDeliveryAbove: '999',
      flatShippingFee: '50',
      deliveryDays: '1-3 Business Days',
      deliverablePincodes: '', // empty = Pan India
      enableStorePickup: true,
      expressDelivery: true,

      // 7. Payment Modes & UPI
      acceptedPaymentModes: ['upi', 'cod', 'bank', 'whatsapp'],
      upiId: 'merchant@okaxis',
      bankName: 'HDFC Bank Ltd',
      bankAccountNo: '50200088991122',
      bankIfsc: 'HDFC0000123',
      bankHolderName: company.name || 'Commercial Enterprise Account',

      // 8. Promotions, Coupons & Bulk Discounts
      announcementActive: true,
      announcementText: '⚡ Festive Wholesale Offer: Get Free Express Delivery on orders above ₹999! Use code WELCOME10 for 10% off.',
      promoCoupon: 'WELCOME10',
      couponType: 'percentage', // 'percentage' | 'flat'
      couponValue: 10,
      couponMinOrder: 499,
      bulkDiscountActive: true,
      bulkMinOrder: 5000,
      bulkDiscountPct: 5,

      // 9. Store Operations & Vacation Mode
      isOnline: true,
      vacationMessage: 'Our showroom is currently paused for annual stock audit. Inquiries will be addressed shortly.'
    };
  });

  // Unique Storefront Public URL
  const storeSlug = storeConfig.slug || user?.id || 'mystore';
  const publicStoreUrl = `${window.location.origin}/catalog/${user?.id || storeSlug}`;

  // Load Products & Orders
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      let [prods, orders] = await Promise.all([
        getItems('products', user.id),
        getItems('catalogOrders', user.id)
      ]);

      // If user has no products in DB yet, seed with real products
      if (!prods || prods.length === 0) {
        prods = DEFAULT_REAL_PRODUCTS;
        // Seed into database for user
        try {
          for (const item of DEFAULT_REAL_PRODUCTS) {
            await addItem('products', item, user.id);
          }
        } catch (e) {
          console.warn('Seeded products locally:', e);
        }
      }

      setProducts(prods || []);
      setCatalogOrders(orders || []);
    } catch (err) {
      console.error('Error loading catalog data:', err);
      setProducts(DEFAULT_REAL_PRODUCTS);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Store Config Save
  const handleSaveConfig = () => {
    setSavingSettings(true);
    localStorage.setItem(`gogstbill_catalog_config_${user?.id || 'default'}`, JSON.stringify(storeConfig));
    setTimeout(() => {
      setSavingSettings(false);
      setSaveSuccessMsg('Store settings saved & synced successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }, 400);
  };

  // Upload Logo file from local device
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 400, 400, 0.9);
      const updated = { ...storeConfig, logoUrl: dataUrl };
      setStoreConfig(updated);
      try {
        localStorage.setItem(`gogstbill_catalog_config_${user?.id || 'default'}`, JSON.stringify(updated));
      } catch (err) {}
    } catch (err) {
      console.error('Failed to process logo file:', err);
      alert('Could not process this image file. Please try another image.');
    }
    e.target.value = '';
  };

  // Upload Banner / Background Cover file from local device
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 1600, 900, 0.85);
      const updated = { ...storeConfig, bannerUrl: dataUrl };
      setStoreConfig(updated);
      try {
        localStorage.setItem(`gogstbill_catalog_config_${user?.id || 'default'}`, JSON.stringify(updated));
      } catch (err) {}
    } catch (err) {
      console.error('Failed to process banner file:', err);
      alert('Could not process this image file. Please try another image.');
    }
    e.target.value = '';
  };

  // Toggle Product Catalog Status
  const handleToggleProductPublish = async (product) => {
    const newStatus = !product.isPublished;
    const updated = { ...product, isPublished: newStatus };
    setProducts(prev => prev.map(p => (p.id === product.id ? updated : p)));
    try {
      await updateItem('products', product.id, { isPublished: newStatus }, user.id);
    } catch (err) {
      console.error('Failed to toggle publish status:', err);
    }
  };

  // Update Product Catalog Badge
  const handleUpdateBadge = async (product, badge) => {
    const updated = { ...product, catalogBadge: badge };
    setProducts(prev => prev.map(p => (p.id === product.id ? updated : p)));
    try {
      await updateItem('products', product.id, { catalogBadge: badge }, user.id);
    } catch (err) {
      console.error('Failed to update badge:', err);
    }
  };

  // Bulk Publish All Products
  const handleBulkPublish = async (publish) => {
    const confirmation = window.confirm(`Are you sure you want to ${publish ? 'publish all' : 'hide all'} products in your digital catalog?`);
    if (!confirmation) return;

    const updated = products.map(p => ({ ...p, isPublished: publish }));
    setProducts(updated);

    try {
      for (const p of products) {
        await updateItem('products', p.id, { isPublished: publish }, user.id);
      }
    } catch (err) {
      console.error('Bulk update error:', err);
    }
  };

  // Convert Catalog Order to Sale Invoice
  const handleConvertToInvoice = (order) => {
    const invoiceItems = (order.items || []).map(item => ({
      id: item.id || Date.now().toString(),
      name: item.name || 'Catalog Item',
      description: item.description || '',
      hsn: item.hsn || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'Pieces (PCS)',
      price: item.price || 0,
      taxRate: item.taxRate || 18,
      amount: (item.price || 0) * (item.quantity || 1)
    }));

    const prefillData = {
      customerName: order.customerName || 'Online Catalog Customer',
      customerPhone: order.customerPhone || '',
      billingAddress: order.customerAddress || '',
      items: invoiceItems,
      notes: `Converted from Digital Catalog Order #${order.orderId || order.id}. Customer Note: ${order.customerNote || 'None'}`
    };

    sessionStorage.setItem('prefill_sale_invoice', JSON.stringify(prefillData));
    navigate('/documents/sale/new');
  };

  // Copy Store Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicStoreUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // WhatsApp Broadcast Share
  const handleShareWhatsApp = () => {
    const msg = `🌟 *Welcome to ${storeConfig.storeName} Official Digital Catalog!* 🚀\n\nBrowse 100% verified live stock, factory-direct prices, and order with 1-click on WhatsApp:\n\n👉 *View Online Catalog:* ${publicStoreUrl}\n\n🚚 *Special Offer:* Free Delivery on orders above ₹${storeConfig.freeDeliveryAbove}!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setCatalogOrders(prev => prev.map(o => (o.id === orderId || o.orderId === orderId ? { ...o, status: newStatus } : o)));
    try {
      await updateItem('catalogOrders', orderId, { status: newStatus }, user?.id);
    } catch (e) {
      console.warn('Could not update order status in DB:', e);
    }
  };

  // Save Quick Edited Product
  const handleSaveEditedProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    const updated = {
      ...editingProduct,
      sellingPrice: Number(editingProduct.sellingPrice || 0),
      mrp: Number(editingProduct.mrp || editingProduct.sellingPrice || 0),
      stock: Number(editingProduct.stock || 0),
      taxRate: Number(editingProduct.taxRate || 18)
    };

    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    try {
      await updateItem('products', updated.id, updated, user?.id);
    } catch (err) {
      console.warn('Could not update product in DB:', err);
    }

    setEditingProduct(null);
  };

  // Create New Product
  const handleCreateNewProduct = async (e) => {
    e.preventDefault();
    if (!newProductForm.name.trim()) {
      alert('Please enter a product name.');
      return;
    }

    const price = Number(newProductForm.sellingPrice) || 999;
    const mrp = Number(newProductForm.mrp) || Math.round(price * 1.35);

    const newProd = {
      id: `prod-${Date.now()}`,
      name: newProductForm.name.trim(),
      description: newProductForm.description.trim() || 'Commercial grade certified product with direct manufacturer warranty.',
      sellingPrice: price,
      mrp: mrp,
      stock: Number(newProductForm.stock) || 10,
      unit: newProductForm.unit || 'Pieces (PCS)',
      hsn: newProductForm.hsn || '8471',
      taxRate: Number(newProductForm.taxRate) || 18,
      productGroup: newProductForm.productGroup || 'Electronics & Hardware',
      catalogBadge: newProductForm.catalogBadge || 'new',
      brand: newProductForm.brand.trim() || storeConfig.storeName,
      image: newProductForm.image.trim() || 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80',
      gallery: [newProductForm.image.trim() || 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80'],
      isPublished: true
    };

    setProducts(prev => [newProd, ...prev]);
    try {
      await addItem('products', newProd, user?.id);
    } catch (err) {
      console.warn('Could not add product to DB:', err);
    }

    setShowAddProductModal(false);
    setNewProductForm({
      name: '',
      description: '',
      sellingPrice: '',
      mrp: '',
      stock: 15,
      unit: 'Pieces (PCS)',
      hsn: '8471',
      taxRate: 18,
      productGroup: 'Electronics & Hardware',
      catalogBadge: 'new',
      brand: '',
      image: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80',
      isPublished: true
    });
  };

  // Bulk Product Actions
  const toggleSelectProduct = (id) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllProducts = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkPublishSelected = async (publish) => {
    if (selectedProductIds.length === 0) return;
    setProducts(prev => prev.map(p => selectedProductIds.includes(p.id) ? { ...p, isPublished: publish } : p));
    for (const id of selectedProductIds) {
      try {
        await updateItem('products', id, { isPublished: publish }, user?.id);
      } catch (e) {}
    }
    setSelectedProductIds([]);
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedProductIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedProductIds.length} selected products?`)) return;
    setProducts(prev => prev.filter(p => !selectedProductIds.includes(p.id)));
    for (const id of selectedProductIds) {
      try {
        await deleteItem('products', id, user?.id);
      } catch (e) {}
    }
    setSelectedProductIds([]);
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Are you sure you want to remove "${product.name}" from your catalog?`)) return;
    setProducts(prev => prev.filter(p => p.id !== product.id));
    try {
      await deleteItem('products', product.id, user?.id);
    } catch (e) {
      console.warn('Could not delete product:', e);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(`Are you sure you want to delete order record #${orderId}?`)) return;
    setCatalogOrders(prev => prev.filter(o => o.id !== orderId && o.orderId !== orderId));
    try {
      await deleteItem('catalogOrders', orderId, user?.id);
    } catch (e) {
      console.warn('Could not delete order:', e);
    }
    if (selectedOrder?.id === orderId || selectedOrder?.orderId === orderId) {
      setSelectedOrder(null);
    }
  };

  const handleExportOrdersCSV = () => {
    if (catalogOrders.length === 0) {
      alert('No catalog orders to export.');
      return;
    }
    const headers = ['Order ID', 'Date', 'Customer Name', 'Phone', 'Address', 'Payment Mode', 'Items', 'Total Amount', 'Status'];
    const rows = catalogOrders.map(o => [
      `"${o.orderId || o.id}"`,
      `"${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}"`,
      `"${(o.customerName || '').replace(/"/g, '""')}"`,
      `"${o.customerPhone || ''}"`,
      `"${(o.customerAddress || '').replace(/"/g, '""')}"`,
      `"${o.paymentMode || ''}"`,
      `"${(o.items || []).map(it => `${it.quantity}x ${it.name}`).join('; ').replace(/"/g, '""')}"`,
      `"${o.totalAmount || 0}"`,
      `"${o.status || 'New Inquiry'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `catalog_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick theme change in preview
  const handleQuickThemeChange = (tpl) => {
    const updated = { ...storeConfig, template: tpl };
    setStoreConfig(updated);
    try {
      localStorage.setItem(`gogstbill_catalog_config_${user?.id || 'default'}`, JSON.stringify(updated));
    } catch (e) {}
    const iframe = document.getElementById('store-live-preview-iframe');
    if (iframe) iframe.src = iframe.src;
  };

  // Analytics KPIs
  const totalProducts = products.length;
  const publishedProducts = products.filter(p => p.isPublished !== false).length;
  const totalInquiryValue = catalogOrders.reduce((sum, ord) => sum + Number(ord.totalAmount || 0), 0);

  // Filtered Products
  const categoriesList = ['all', ...new Set(products.map(p => p.productGroup || 'Others'))];
  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.barcodeStr || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || (p.productGroup || 'Others') === selectedCategory;
    const isPub = p.isPublished !== false;
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'published' && isPub) ||
                          (filterStatus === 'hidden' && !isPub);
    return matchesSearch && matchesCat && matchesStatus;
  });

  // Filtered Orders
  const filteredOrders = catalogOrders.filter(ord => {
    if (orderStatusFilter === 'all') return true;
    const s = (ord.status || '').toLowerCase();
    return s.includes(orderStatusFilter.toLowerCase());
  });

  // Preview URL: Storefront vs Product Detail
  const previewProdId = products[0]?.id || 'prod-scanner-2d';
  const previewUrl = previewPage === 'storefront' 
    ? publicStoreUrl 
    : `${window.location.origin}/catalog/${user?.id || storeSlug}/product/${previewProdId}`;

  return (
    <div className="catalog-admin-container">
      {/* HERO HEADER */}
      <div className="catalog-header-hero">
        <div className="hero-main-row">
          <div className="hero-title-area">
            <div className="hero-icon-badge">
              <Store size={30} />
            </div>
            <div>
              <h1>
                <span>Digital Catalog & Storefront</span>
                <span className={`hero-status-pill ${storeConfig.isOnline ? 'online' : 'paused'}`}>
                  <span className={`status-dot ${storeConfig.isOnline ? 'active' : 'paused'}`}></span>
                  {storeConfig.isOnline ? 'Catalog Live' : 'Store Paused'}
                </span>
                <span className="hero-template-badge">
                  Theme: {storeConfig.template?.toUpperCase() || 'FLAGSHIP'}
                </span>
              </h1>
              <p className="hero-subtitle">
                Showcase products online, accept customer orders on WhatsApp, and generate instant GST invoices.
              </p>
            </div>
          </div>

          <div className="hero-action-buttons">
            <button 
              className="btn-hero-glass" 
              onClick={() => window.open(publicStoreUrl, '_blank')}
              title="Open public customer storefront in a new tab"
            >
              <ExternalLink size={17} /> Live Storefront
            </button>
            <button 
              className="btn-hero-glass" 
              onClick={() => setShowQRModal(true)}
              title="Generate printable counter standee with QR Code"
            >
              <QrCode size={17} /> QR Standee
            </button>
            <button 
              className="btn-hero-primary" 
              onClick={handleShareWhatsApp}
              title="Share catalog directly with WhatsApp contacts"
            >
              <MessageCircle size={18} /> Share on WhatsApp
            </button>
          </div>
        </div>

        {/* STORE LINK & REAL CAMERA-SCANNABLE QR STRIP */}
        <div className="store-link-strip">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ background: '#ffffff', padding: '6px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.25)' }}>
              <QRCodeSVG 
                value={publicStoreUrl}
                size={44}
                level="M"
                includeMargin={false}
                fgColor="#0f172a"
              />
            </div>
            <div>
              <div className="store-link-label">Your Live Customer Storefront Link</div>
              <div className="store-link-url" onClick={handleCopyLink} title="Click to copy link">
                {publicStoreUrl}
              </div>
            </div>
          </div>
          <div className="store-link-actions">
            <button className="mini-icon-btn" onClick={handleCopyLink} title="Copy Store Link">
              {copiedLink ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            </button>
            <button className="mini-icon-btn" onClick={() => window.open(publicStoreUrl, '_blank')} title="View Live Store">
              <ArrowUpRight size={16} />
            </button>
            <button className="mini-icon-btn" onClick={() => setShowQRModal(true)} title="Expand Full Counter Standee">
              <QrCode size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="catalog-tabs-bar">
        <button 
          className={`catalog-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <TrendingUp size={17} /> Live Overview
        </button>
        <button 
          className={`catalog-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package size={17} /> Catalog Products
          <span className="tab-badge">{publishedProducts}/{totalProducts}</span>
        </button>
        <button 
          className={`catalog-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <ShoppingBag size={17} /> Orders & Inquiries
          {catalogOrders.length > 0 && <span className="tab-badge">{catalogOrders.length}</span>}
        </button>
        <button 
          className={`catalog-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <Eye size={17} /> Live Store Preview
        </button>
        <button 
          className={`catalog-tab-btn ${activeTab === 'marketing' ? 'active' : ''}`}
          onClick={() => setActiveTab('marketing')}
        >
          <Sparkles size={17} /> QR & Marketing Studio
        </button>
        <button 
          className={`catalog-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={17} /> Store Settings
        </button>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="overview-tab-content">
          <div className="stats-kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                <Package size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Active Catalog Products</span>
                <span className="kpi-value">{publishedProducts}</span>
                <span className="kpi-subtext">{totalProducts - publishedProducts} hidden from store</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
                <ShoppingBag size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Total Catalog Orders</span>
                <span className="kpi-value">{catalogOrders.length}</span>
                <span className="kpi-subtext">Direct WhatsApp & Store orders</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                <TrendingUp size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Total Inquiry Pipeline</span>
                <span className="kpi-value">₹{totalInquiryValue.toLocaleString('en-IN')}</span>
                <span className="kpi-subtext">Convertible to GST Sales</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: '#f3e8ff', color: '#9333ea' }}>
                <Store size={24} />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Active Store Theme</span>
                <span className="kpi-value" style={{ textTransform: 'capitalize' }}>{storeConfig.template || 'Amazon'}</span>
                <span className="kpi-subtext">5 Themes Available</span>
              </div>
            </div>
          </div>

          {/* QUICK PROMOTIONAL BANNER */}
          <div className="quick-promo-card">
            <div className="promo-left">
              <div className="promo-badge">
                <Sparkles size={14} /> LIVE DIGITAL STORE READY
              </div>
              <h3>Empower Customers to Buy 24/7 on WhatsApp & Web</h3>
              <p>
                Share your store link with customers, print your scannable counter standee, and let buyers browse live inventory with real-time MRP savings.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => setActiveTab('preview')}>
                  <Eye size={16} /> Open Live Preview
                </button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('settings')}>
                  <Settings size={16} /> Customize 5 Templates & Settings
                </button>
              </div>
            </div>
            <div className="promo-right">
              <div className="promo-qr-box">
                <QRCodeSVG value={publicStoreUrl} size={110} level="H" fgColor="#0f172a" />
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginTop: '0.5rem' }}>
                  SCAN TO TEST ON PHONE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS MANAGER */}
      {activeTab === 'products' && (
        <div className="catalog-glass-card">
          <div className="catalog-section-header">
            <div className="section-title-wrap">
              <h2>Curate Online Catalog Products</h2>
              <p>Control which inventory items appear online, set badge ribbons (Bestseller, Hot Deal, New Arrival), and share direct product links.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-secondary" 
                onClick={selectAllProducts}
                title="Select or deselect all products in current view"
              >
                <CheckSquare size={15} /> {selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
              <button className="btn btn-primary" onClick={() => setShowAddProductModal(true)}>
                <Plus size={15} /> Add Product
              </button>
              <button className="btn btn-secondary" onClick={() => handleBulkPublish(true)}>
                Publish All
              </button>
              <button className="btn btn-secondary" onClick={() => handleBulkPublish(false)}>
                Hide All
              </button>
            </div>
          </div>

          {/* FILTERS TOOLBAR */}
          <div className="products-filter-toolbar">
            <div className="search-box-pill">
              <Search size={16} color="#64748b" />
              <input 
                type="text" 
                placeholder="Search products by name or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-select-group">
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="catalog-select"
              >
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>Category: {cat}</option>
                ))}
              </select>

              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="catalog-select"
              >
                <option value="all">Status: All Items</option>
                <option value="published">Visible in Catalog</option>
                <option value="hidden">Hidden from Catalog</option>
              </select>
            </div>
          </div>

          {/* BULK ACTION BAR */}
          {selectedProductIds.length > 0 && (
            <div className="bulk-selection-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>
                  {selectedProductIds.length} item{selectedProductIds.length > 1 ? 's' : ''} selected
                </span>
                <button 
                  onClick={() => setSelectedProductIds([])}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                >
                  Clear Selection
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => handleBulkPublishSelected(true)}>
                  <Check size={14} /> Publish Selected
                </button>
                <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => handleBulkPublishSelected(false)}>
                  <EyeOff size={14} /> Hide Selected
                </button>
                <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: '#ef4444', borderColor: '#fca5a5' }} onClick={handleBulkDeleteSelected}>
                  <Trash2 size={14} /> Delete Selected
                </button>
              </div>
            </div>
          )}

          {/* PRODUCTS LIST */}
          <div className="products-manage-list">
            {filteredProducts.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                <Package size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
                <h3>No products match your search or filter</h3>
                <p>Try resetting search or publish items to your digital catalog.</p>
              </div>
            ) : (
              filteredProducts.map(product => (
                <div key={product.id} className="product-manage-row">
                  {/* Select Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedProductIds.includes(product.id)}
                      onChange={() => toggleSelectProduct(product.id)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0284c7' }}
                      title="Select product for bulk action"
                    />
                  </div>

                  {/* Thumbnail */}
                  <div 
                    className="product-thumb-wrap" 
                    onClick={() => window.open(`/catalog/${user?.id || storeSlug}/product/${product.id}`, '_blank')}
                    title="Click to view product detail page"
                    style={{ cursor: 'pointer' }}
                  >
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      <Package size={24} className="product-thumb-fallback" />
                    )}
                  </div>

                  {/* Primary Info */}
                  <div className="product-meta-primary">
                    <h4 
                      onClick={() => window.open(`/catalog/${user?.id || storeSlug}/product/${product.id}`, '_blank')}
                      style={{ cursor: 'pointer' }}
                      title="View product detail page"
                    >
                      {product.name}
                    </h4>
                    <span className="product-sku-tag">HSN: {product.hsn || '8471'}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                      Stock: <strong>{product.stock || 0} {product.unit || 'PCS'}</strong>
                    </span>
                  </div>

                  {/* Price */}
                  <div className="price-display-col">
                    <span className="catalog-price-val">₹{Number(product.sellingPrice || 0).toLocaleString('en-IN')}</span>
                    {product.mrp && Number(product.mrp) > Number(product.sellingPrice) && (
                      <span className="catalog-mrp-val">MRP ₹{Number(product.mrp).toLocaleString('en-IN')}</span>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <span style={{ fontSize: '0.78rem', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '6px', color: '#475569', fontWeight: 600 }}>
                      {product.productGroup || 'Others'}
                    </span>
                  </div>

                  {/* Badge Tag Selector */}
                  <div>
                    <select
                      className={`badge-select-pill ${product.catalogBadge?.toLowerCase() || 'none'}`}
                      value={product.catalogBadge || 'none'}
                      onChange={(e) => handleUpdateBadge(product, e.target.value)}
                    >
                      <option value="none">Badge: None</option>
                      <option value="bestseller">⭐ Bestseller</option>
                      <option value="hot">🔥 Hot Deal</option>
                      <option value="new">🚀 New Arrival</option>
                      <option value="featured">💎 Featured</option>
                    </select>
                  </div>

                  {/* Toggle Show in Catalog */}
                  <div>
                    <label className="catalog-switch" title="Toggle visibility in online catalog">
                      <input 
                        type="checkbox" 
                        checked={!!product.isPublished}
                        onChange={() => handleToggleProductPublish(product)}
                      />
                      <span className="catalog-slider"></span>
                    </label>
                  </div>

                  {/* Action Buttons: View, Edit, Share, Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button 
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#0284c7', borderColor: '#bae6fd' }}
                      onClick={() => window.open(`/catalog/${user?.id || storeSlug}/product/${product.id}`, '_blank')}
                      title="Open Amazon-style Product Detail Page"
                    >
                      <Eye size={13} /> View
                    </button>
                    <button 
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      onClick={() => setEditingProduct(product)}
                      title="Quick edit product details, price and stock"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    <button 
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      onClick={() => {
                        const prodUrl = `${publicStoreUrl}?highlight=${product.id}`;
                        const text = `Check out *${product.name}* at ₹${product.sellingPrice} in our online store: ${prodUrl}`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      title="Share product link via WhatsApp"
                    >
                      <Share2 size={13} />
                    </button>
                    <button 
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', borderColor: '#fee2e2' }}
                      onClick={() => handleDeleteProduct(product)}
                      title="Delete product from catalog"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS & INQUIRIES PIPELINE */}
      {activeTab === 'orders' && (
        <div className="catalog-glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Catalog Orders & Leads (Mini CRM)</h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Direct inquiries and orders placed from your digital storefront. Convert any order into a GST Sale Invoice with 1 click.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleExportOrdersCSV}
                title="Download CSV spreadsheet of all customer inquiries and orders"
              >
                <Download size={15} /> Export CSV
              </button>
              <button className="btn btn-secondary" onClick={loadData} title="Refresh live orders">
                <RefreshCw size={15} /> Refresh Orders
              </button>
            </div>
          </div>

          {/* ORDER STATUS FILTER PILLS */}
          <div className="orders-filter-chips">
            {['all', 'New Inquiry', 'Contacted', 'Invoiced', 'Dispatched', 'Completed'].map(st => (
              <button 
                key={st} 
                className={`order-filter-chip ${orderStatusFilter === st ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter(st)}
              >
                {st === 'all' ? 'All Orders' : st}
                {st === 'all' ? ` (${catalogOrders.length})` : ` (${catalogOrders.filter(o => (o.status || '').toLowerCase() === st.toLowerCase()).length})`}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
              <ShoppingBag size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
              <h3 style={{ margin: '0 0 0.4rem 0', color: '#0f172a' }}>No Catalog Orders Found</h3>
              <p style={{ margin: '0 0 1.25rem 0', maxWidth: '420px', marginInline: 'auto', fontSize: '0.88rem' }}>
                {catalogOrders.length === 0 
                  ? 'When customers view your online catalog and tap "Order on WhatsApp" or "Submit Order", they will appear here with full customer details and item lists.'
                  : 'No orders match the selected status filter.'}
              </p>
              <button className="btn btn-primary" onClick={handleShareWhatsApp}>
                <MessageCircle size={16} /> Broadcast Catalog on WhatsApp
              </button>
            </div>
          ) : (
            <div className="orders-table-wrapper">
              <table className="orders-pipeline-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Customer Name & Contact</th>
                    <th>Delivery Address</th>
                    <th>Items Ordered</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, idx) => (
                    <tr key={order.id || idx}>
                      <td>
                        <span className="order-id-badge">#{order.orderId || `ORD-${idx + 101}`}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Today'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{order.customerName || 'Anonymous Customer'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#0284c7' }}>{order.customerPhone || 'N/A'}</div>
                      </td>
                      <td style={{ maxWidth: '180px', fontSize: '0.82rem', color: '#475569' }}>
                        {order.customerAddress || 'Direct Pickup / WhatsApp inquiry'}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          {(order.items || []).map((it, i) => (
                            <div key={i}>{it.quantity}x {it.name}</div>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                        ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <select 
                          className="catalog-select"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}
                          value={order.status || 'New Inquiry'}
                          onChange={(e) => handleUpdateOrderStatus(order.id || order.orderId, e.target.value)}
                        >
                          <option value="New Inquiry">🔵 New Inquiry</option>
                          <option value="Contacted">🟡 Contacted</option>
                          <option value="Invoiced">📄 Invoiced</option>
                          <option value="Dispatched">🚚 Dispatched</option>
                          <option value="Completed">✅ Completed</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button 
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => setSelectedOrder(order)}
                            title="View full order details & items"
                          >
                            <Eye size={13} /> Details
                          </button>
                          <button 
                            className="btn-convert-invoice" 
                            onClick={() => handleConvertToInvoice(order)}
                            title="Generate GST Sale Invoice for this customer"
                          >
                            <FileText size={13} /> To Invoice
                          </button>
                          {order.customerPhone && (
                            <button 
                              className="btn-whatsapp-chat"
                              onClick={() => window.open(`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${order.customerName}, this is ${storeConfig.storeName}. We received your order for ${order.items?.length || 0} items. Please let us know if you need any adjustments!`)}`, '_blank')}
                              title="Chat with customer on WhatsApp"
                            >
                              <MessageCircle size={13} />
                            </button>
                          )}
                          <button 
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', color: '#ef4444', borderColor: '#fee2e2' }}
                            onClick={() => handleDeleteOrder(order.id || order.orderId)}
                            title="Delete order record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RESPONSIVE LIVE STORE PREVIEW */}
      {activeTab === 'preview' && (
        <div className="preview-normal-container">
          <div className="preview-toolbar">
            <div className="preview-toolbar-left" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className="preview-status-indicator">
                <span className="live-pulsing-dot"></span>
                <strong>Live Responsive Store Preview</strong>
              </div>

              {/* DEVICE SWITCHER */}
              <div className="preview-device-switcher">
                <button 
                  className={`preview-device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                  onClick={() => setPreviewDevice('desktop')}
                  title="Desktop View (1280px)"
                >
                  <Monitor size={15} /> Desktop
                </button>
                <button 
                  className={`preview-device-btn ${previewDevice === 'tablet' ? 'active' : ''}`}
                  onClick={() => setPreviewDevice('tablet')}
                  title="Tablet View (768px)"
                >
                  <Tablet size={15} /> Tablet
                </button>
                <button 
                  className={`preview-device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                  onClick={() => setPreviewDevice('mobile')}
                  title="Mobile View (390px)"
                >
                  <Smartphone size={15} /> Mobile
                </button>
              </div>

              {/* PAGE VIEW SWITCHER */}
              <div className="preview-page-switcher">
                <button
                  className="preset-pill-btn"
                  style={{ 
                    background: previewPage === 'storefront' ? '#0284c7' : '#ffffff', 
                    color: previewPage === 'storefront' ? '#ffffff' : '#334155',
                    borderColor: previewPage === 'storefront' ? '#0284c7' : '#cbd5e1'
                  }}
                  onClick={() => setPreviewPage('storefront')}
                >
                  Storefront
                </button>
                <button
                  className="preset-pill-btn"
                  style={{ 
                    background: previewPage === 'pdp' ? '#0284c7' : '#ffffff', 
                    color: previewPage === 'pdp' ? '#ffffff' : '#334155',
                    borderColor: previewPage === 'pdp' ? '#0284c7' : '#cbd5e1'
                  }}
                  onClick={() => setPreviewPage('pdp')}
                >
                  Product Detail (PDP)
                </button>
              </div>

              {/* QUICK THEME SWITCHER */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Theme:</span>
                <select 
                  className="catalog-select"
                  style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem' }}
                  value={storeConfig.template || 'flagship'}
                  onChange={(e) => handleQuickThemeChange(e.target.value)}
                >
                  <option value="flagship">Flagship Showroom</option>
                  <option value="wholesale">B2B Wholesale</option>
                  <option value="boutique">Luxury Boutique</option>
                  <option value="neo-tech">Neo-Tech Cyber</option>
                  <option value="express-mart">Express QuickMart</option>
                </select>
              </div>

              <div className="preview-url-pill">
                <Lock size={12} color="#10b981" />
                <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewUrl}</span>
                <button 
                  className="btn-copy-preview-url" 
                  onClick={() => {
                    navigator.clipboard.writeText(previewUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  title="Copy Link"
                >
                  {copiedLink ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div className="preview-toolbar-right">
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const iframe = document.getElementById('store-live-preview-iframe');
                  if (iframe) iframe.src = iframe.src;
                }}
                title="Reload preview frame"
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => window.open(previewUrl, '_blank')}
                title="Open live storefront in new browser tab"
              >
                <ExternalLink size={14} /> Open in Tab
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setShowQRModal(true)}
              >
                <QrCode size={14} /> Print Standee
              </button>
            </div>
          </div>

          {/* RESPONSIVE STAGE FRAME */}
          <div className="preview-stage-container">
            <div className={`preview-device-frame preview-device-${previewDevice}`}>
              {previewDevice === 'mobile' && <div className="preview-mobile-notch" />}
              <iframe 
                id="store-live-preview-iframe"
                key={`${previewPage}-${previewDevice}-${storeConfig.template}`}
                src={previewUrl}
                title="Live Responsive Storefront Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXTENDED COMPREHENSIVE SETTINGS */}
      {activeTab === 'settings' && (
        <div className="catalog-glass-card">
          <div className="catalog-section-header">
            <div className="section-title-wrap">
              <h2>Comprehensive Storefront Settings</h2>
              <p>Configure 5 themes, branding, WhatsApp ordering, deliverable pincodes, UPI QR, GST compliance, and promotional coupons.</p>
            </div>
            <button className="btn btn-primary" onClick={handleSaveConfig} disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save & Publish All Settings'}
            </button>
          </div>

          {saveSuccessMsg && (
            <div style={{ margin: '1rem 1.5rem 0 1.5rem', padding: '0.75rem 1rem', background: '#ecfdf5', color: '#065f46', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} /> {saveSuccessMsg}
            </div>
          )}

          {/* SETTINGS SUB-NAV */}
          <div className="settings-subnav-bar">
            <button 
              className={`settings-nav-pill ${settingsSection === 'template' ? 'active' : ''}`}
              onClick={() => setSettingsSection('template')}
            >
              <Palette size={15} /> 1. Store Theme (5 Templates)
            </button>
            <button 
              className={`settings-nav-pill ${settingsSection === 'identity' ? 'active' : ''}`}
              onClick={() => setSettingsSection('identity')}
            >
              <Image size={15} /> 2. Branding & Media
            </button>
            <button 
              className={`settings-nav-pill ${settingsSection === 'contact' ? 'active' : ''}`}
              onClick={() => setSettingsSection('contact')}
            >
              <Phone size={15} /> 3. WhatsApp & Support
            </button>
            <button 
              className={`settings-nav-pill ${settingsSection === 'location' ? 'active' : ''}`}
              onClick={() => setSettingsSection('location')}
            >
              <MapPin size={15} /> 4. Showroom & Hours
            </button>
            <button 
              className={`settings-nav-pill ${settingsSection === 'compliance' ? 'active' : ''}`}
              onClick={() => setSettingsSection('compliance')}
            >
              <ShieldCheck size={15} /> 5. GST & Legal
            </button>
            <button 
              className={`settings-nav-pill ${settingsSection === 'shipping' ? 'active' : ''}`}
              onClick={() => setSettingsSection('shipping')}
            >
              <Truck size={15} /> 6. Shipping & Pincodes
            </button>
            <button 
              className={`settings-nav-pill ${settingsSection === 'payments' ? 'active' : ''}`}
              onClick={() => setSettingsSection('payments')}
            >
              <CreditCard size={15} /> 7. Payments & UPI QR
            </button>
            <button 
              className={`settings-nav-pill ${settingsSection === 'promotions' ? 'active' : ''}`}
              onClick={() => setSettingsSection('promotions')}
            >
              <Tag size={15} /> 8. Coupons & Bulk Offers
            </button>
            <button 
              className={`settings-nav-pill ${settingsSection === 'status' ? 'active' : ''}`}
              onClick={() => setSettingsSection('status')}
            >
              <Clock size={15} /> 9. Store Status
            </button>
          </div>

          <div className="settings-section-container">
            {/* SUB-SECTION 1: 5 TEMPLATES */}
            {settingsSection === 'template' && (
              <div className="settings-card-block">
                <div className="block-header">
                  <h3>Choose from 5 Modern E-Commerce Storefront Templates</h3>
                  <p>Each template features bespoke styling, color schemes, badges, and layout accents tailored for modern buyers.</p>
                </div>

                <div className="five-templates-grid">
                  {/* Template 1: Modern Flagship */}
                  <div 
                    className={`template-selector-card ${storeConfig.template === 'flagship' ? 'selected' : ''}`}
                    onClick={() => setStoreConfig({ ...storeConfig, template: 'flagship' })}
                  >
                    <div className="tpl-badge-header" style={{ background: '#0284c7', color: '#ffffff' }}>
                      👑 Modern Flagship Showroom
                    </div>
                    <div className="tpl-color-strip">
                      <span style={{ background: '#0284c7' }}></span>
                      <span style={{ background: '#0369a1' }}></span>
                      <span style={{ background: '#38bdf8' }}></span>
                      <span style={{ background: '#10b981' }}></span>
                    </div>
                    <p className="tpl-desc">
                      Contemporary high-conversion showroom with cinematic hero cover, 4-column balanced cards, verified merchant trust seals, and seamless WhatsApp concierge.
                    </p>
                    <div className="tpl-tags">
                      <span>⭐ Bestseller</span>
                      <span>Verified GST</span>
                      <span>Express Shipping</span>
                    </div>
                  </div>

                  {/* Template 2: B2B Wholesale */}
                  <div 
                    className={`template-selector-card ${storeConfig.template === 'wholesale' ? 'selected' : ''}`}
                    onClick={() => setStoreConfig({ ...storeConfig, template: 'wholesale' })}
                  >
                    <div className="tpl-badge-header" style={{ background: '#1e293b', color: '#38bdf8' }}>
                      ⚡ B2B Wholesale & Industrial Pro
                    </div>
                    <div className="tpl-color-strip">
                      <span style={{ background: '#0f172a' }}></span>
                      <span style={{ background: '#1e293b' }}></span>
                      <span style={{ background: '#15803d' }}></span>
                      <span style={{ background: '#38bdf8' }}></span>
                    </div>
                    <p className="tpl-desc">
                      High-density matrix with live wholesale tier calculators (10% off 10+, 20% off 50+), prominent HSN codes, and 18% GST ITC claim badges.
                    </p>
                    <div className="tpl-tags">
                      <span>Tier Pricing Matrix</span>
                      <span>HSN Codes</span>
                      <span>18% GST ITC Claim</span>
                    </div>
                  </div>

                  {/* Template 3: Luxury Boutique */}
                  <div 
                    className={`template-selector-card ${storeConfig.template === 'boutique' ? 'selected' : ''}`}
                    onClick={() => setStoreConfig({ ...storeConfig, template: 'boutique' })}
                  >
                    <div className="tpl-badge-header" style={{ background: '#09090b', color: '#d4af37' }}>
                      ✨ Minimalist Luxury & Designer
                    </div>
                    <div className="tpl-color-strip">
                      <span style={{ background: '#09090b' }}></span>
                      <span style={{ background: '#18181b' }}></span>
                      <span style={{ background: '#d4af37' }}></span>
                      <span style={{ background: '#f5f5f7' }}></span>
                    </div>
                    <p className="tpl-desc">
                      Editorial minimalism with generous whitespace, subtle obsidian & champagne gold typography, borderless floating image frames, and quiet elegance.
                    </p>
                    <div className="tpl-tags">
                      <span>Editorial Whitespace</span>
                      <span>Champagne Gold</span>
                      <span>Boutique Style</span>
                    </div>
                  </div>

                  {/* Template 4: Neo-Tech */}
                  <div 
                    className={`template-selector-card ${storeConfig.template === 'neo-tech' ? 'selected' : ''}`}
                    onClick={() => setStoreConfig({ ...storeConfig, template: 'neo-tech' })}
                  >
                    <div className="tpl-badge-header" style={{ background: '#0b0f19', color: '#06b6d4' }}>
                      💻 Neo-Tech & Cyber Hardware
                    </div>
                    <div className="tpl-color-strip">
                      <span style={{ background: '#0b0f19' }}></span>
                      <span style={{ background: '#06b6d4' }}></span>
                      <span style={{ background: '#8b5cf6' }}></span>
                      <span style={{ background: '#10b981' }}></span>
                    </div>
                    <p className="tpl-desc">
                      Futuristic dark-mode interface with electric cyan and neon violet circuit accents, hardware specs badges, and high-performance visual cards.
                    </p>
                    <div className="tpl-tags">
                      <span>Cyber Dark</span>
                      <span>Technical Specs</span>
                      <span>Circuit Accents</span>
                    </div>
                  </div>

                  {/* Template 5: QuickMart Express */}
                  <div 
                    className={`template-selector-card ${storeConfig.template === 'express-mart' ? 'selected' : ''}`}
                    onClick={() => setStoreConfig({ ...storeConfig, template: 'express-mart' })}
                  >
                    <div className="tpl-badge-header" style={{ background: '#059669', color: '#fef08a' }}>
                      🥦 QuickMart & SuperStore
                    </div>
                    <div className="tpl-color-strip">
                      <span style={{ background: '#059669' }}></span>
                      <span style={{ background: '#10b981' }}></span>
                      <span style={{ background: '#f97316' }}></span>
                      <span style={{ background: '#f8faf5' }}></span>
                    </div>
                    <p className="tpl-desc">
                      High-velocity retail store with instant horizontal category slider, pack-size chips (1 Kg, 500g, Pack of 50), and fast 1-tap quantity steppers on cards.
                    </p>
                    <div className="tpl-tags">
                      <span>⚡ Same-Day Dispatch</span>
                      <span>Pack Sizing</span>
                      <span>Fast Stepper Buy</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-SECTION 2: BRANDING & SHOWROOM MEDIA */}
            {settingsSection === 'identity' && (
              <div className="settings-card-block">
                <div className="block-header">
                  <h3>Store Identity, Showroom Media & Bio</h3>
                  <p>Customize your store name, logo badge, hero showroom cover image, and tagline.</p>
                </div>

                <div className="form-fields-grid-2">
                  <div className="form-group-item">
                    <label>Store Public Name</label>
                    <input 
                      type="text" 
                      value={storeConfig.storeName}
                      onChange={(e) => setStoreConfig({ ...storeConfig, storeName: e.target.value })}
                      placeholder="e.g. Apex Commercial Showroom"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>Established Year</label>
                    <input 
                      type="text" 
                      value={storeConfig.establishedYear}
                      onChange={(e) => setStoreConfig({ ...storeConfig, establishedYear: e.target.value })}
                      placeholder="e.g. 2018"
                    />
                  </div>
                </div>

                <div className="form-group-item" style={{ marginTop: '1rem' }}>
                  <label>Store Slogan / Tagline</label>
                  <input 
                    type="text" 
                    value={storeConfig.tagline}
                    onChange={(e) => setStoreConfig({ ...storeConfig, tagline: e.target.value })}
                    placeholder="e.g. Wholesale & Retail Best Quality Products at Factory Prices"
                  />
                </div>

                <div className="form-group-item" style={{ marginTop: '1rem' }}>
                  <label>About Showroom / Merchant Bio</label>
                  <textarea 
                    rows={3}
                    value={storeConfig.description}
                    onChange={(e) => setStoreConfig({ ...storeConfig, description: e.target.value })}
                    placeholder="Describe your showroom, certifications, and inventory specialties..."
                  />
                </div>

                {/* LOGO & BANNER / BG COVER */}
                <div className="media-config-grid" style={{ marginTop: '1.5rem' }}>
                  {/* STORE LOGO */}
                  <div className="media-preview-box">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                        Store Logo
                      </label>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Square (1:1) Recommended</span>
                    </div>

                    <div className="media-thumb-preview">
                      <img 
                        src={storeConfig.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80'} 
                        alt="Store Logo Preview" 
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80'; }} 
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Current Store Logo</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Used in storefront navbar, invoice header & QR standee</div>
                      </div>
                    </div>

                    {/* Local File Upload Button */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <label 
                        className="btn-upload-trigger"
                      >
                        <Upload size={15} /> Upload Logo File
                        <input 
                          type="file" 
                          accept="image/png,image/jpeg,image/webp,image/svg+xml" 
                          style={{ display: 'none' }} 
                          onChange={handleLogoUpload} 
                        />
                      </label>

                      {storeConfig.logoUrl && (
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', color: '#ef4444', borderColor: '#fee2e2' }}
                          onClick={() => setStoreConfig({ ...storeConfig, logoUrl: '' })}
                          title="Remove current logo"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                    </div>

                    {/* Or URL input */}
                    <div style={{ marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                        Or Paste Logo Web URL:
                      </span>
                      <input 
                        type="text" 
                        value={storeConfig.logoUrl}
                        onChange={(e) => setStoreConfig({ ...storeConfig, logoUrl: e.target.value })}
                        placeholder="Paste image URL..."
                      />
                    </div>

                    {/* Quick presets */}
                    <div className="quick-presets-row">
                      <span style={{ fontSize: '0.72rem', color: '#64748b', width: '100%' }}>Sample Presets:</span>
                      <button 
                        type="button"
                        className="preset-pill-btn"
                        onClick={() => setStoreConfig({ ...storeConfig, logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80' })}
                      >
                        Luxury Gold Badge
                      </button>
                      <button 
                        type="button"
                        className="preset-pill-btn"
                        onClick={() => setStoreConfig({ ...storeConfig, logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300&auto=format&fit=crop&q=80' })}
                      >
                        Modern Tech Shield
                      </button>
                    </div>
                  </div>

                  {/* HERO BANNER / BACKGROUND (BG) */}
                  <div className="media-preview-box">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                        Showroom Hero Background (BG)
                      </label>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Widescreen (16:9) Recommended</span>
                    </div>

                    <div className="media-thumb-preview banner-thumb">
                      <img 
                        src={storeConfig.bannerUrl || 'https://images.unsplash.com/photo-1541888946425-d0fbb18f156d?w=1600&auto=format&fit=crop&q=80'} 
                        alt="Store Banner Preview" 
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1541888946425-d0fbb18f156d?w=1600&auto=format&fit=crop&q=80'; }} 
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Hero Background Banner</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Cinematic background shown across storefront hero cover</div>
                      </div>
                    </div>

                    {/* Local File Upload Button */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <label 
                        className="btn-upload-trigger" 
                      >
                        <Upload size={15} /> Upload Background File
                        <input 
                          type="file" 
                          accept="image/png,image/jpeg,image/webp" 
                          style={{ display: 'none' }} 
                          onChange={handleBannerUpload} 
                        />
                      </label>

                      {storeConfig.bannerUrl && (
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', color: '#ef4444', borderColor: '#fee2e2' }}
                          onClick={() => setStoreConfig({ ...storeConfig, bannerUrl: '' })}
                          title="Remove current background"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                    </div>

                    {/* Or URL input */}
                    <div style={{ marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                        Or Paste Background Web URL:
                      </span>
                      <input 
                        type="text" 
                        value={storeConfig.bannerUrl}
                        onChange={(e) => setStoreConfig({ ...storeConfig, bannerUrl: e.target.value })}
                        placeholder="Paste cover banner URL..."
                      />
                    </div>

                    {/* Quick presets */}
                    <div className="quick-presets-row">
                      <span style={{ fontSize: '0.72rem', color: '#64748b', width: '100%' }}>Sample Presets:</span>
                      <button 
                        type="button"
                        className="preset-pill-btn"
                        onClick={() => setStoreConfig({ ...storeConfig, bannerUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f156d?w=1600&auto=format&fit=crop&q=80' })}
                      >
                        Electronics Showroom
                      </button>
                      <button 
                        type="button"
                        className="preset-pill-btn"
                        onClick={() => setStoreConfig({ ...storeConfig, bannerUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1600&auto=format&fit=crop&q=80' })}
                      >
                        Supermarket Mart
                      </button>
                      <button 
                        type="button"
                        className="preset-pill-btn"
                        onClick={() => setStoreConfig({ ...storeConfig, bannerUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&auto=format&fit=crop&q=80' })}
                      >
                        Industrial Warehouse
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-SECTION 3: WHATSAPP ORDERING & SUPPORT */}
            {settingsSection === 'contact' && (
              <div className="settings-card-block">
                <div className="block-header">
                  <h3>WhatsApp Direct Ordering & Customer Support</h3>
                  <p>Configure the WhatsApp business number where customer orders and inquiries are sent.</p>
                </div>

                <div className="form-fields-grid-2">
                  <div className="form-group-item">
                    <label>WhatsApp Order Receiving Number (With Country Code)</label>
                    <input 
                      type="text" 
                      value={storeConfig.whatsappNumber}
                      onChange={(e) => setStoreConfig({ ...storeConfig, whatsappNumber: e.target.value })}
                      placeholder="e.g. 919876543210"
                    />
                    <small style={{ color: '#64748b' }}>Orders placed by customers will open WhatsApp chat with this number.</small>
                  </div>

                  <div className="form-group-item">
                    <label>Calling Support Phone Number</label>
                    <input 
                      type="text" 
                      value={storeConfig.phone}
                      onChange={(e) => setStoreConfig({ ...storeConfig, phone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>Support Email Address</label>
                    <input 
                      type="email" 
                      value={storeConfig.email}
                      onChange={(e) => setStoreConfig({ ...storeConfig, email: e.target.value })}
                      placeholder="sales@store.com"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>Store Manager / Contact Person Name</label>
                    <input 
                      type="text" 
                      value={storeConfig.contactPerson}
                      onChange={(e) => setStoreConfig({ ...storeConfig, contactPerson: e.target.value })}
                      placeholder="e.g. Rajesh Kumar"
                    />
                  </div>
                </div>

                <div className="form-group-item" style={{ marginTop: '1rem' }}>
                  <label>Default WhatsApp Welcome Order Message Header</label>
                  <input 
                    type="text" 
                    value={storeConfig.whatsappWelcomeMsg}
                    onChange={(e) => setStoreConfig({ ...storeConfig, whatsappWelcomeMsg: e.target.value })}
                    placeholder="e.g. Hello! I am placing an order from your digital storefront catalog."
                  />
                </div>
              </div>
            )}

            {/* SUB-SECTION 4: SHOWROOM LOCATION & HOURS */}
            {settingsSection === 'location' && (
              <div className="settings-card-block">
                <div className="block-header">
                  <h3>Physical Showroom Location & Working Hours</h3>
                  <p>Display your physical location so local buyers can pick up orders or visit in person.</p>
                </div>

                <div className="form-fields-grid-2">
                  <div className="form-group-item">
                    <label>Showroom Street Address</label>
                    <input 
                      type="text" 
                      value={storeConfig.address}
                      onChange={(e) => setStoreConfig({ ...storeConfig, address: e.target.value })}
                      placeholder="e.g. Shop No. 12, Commercial Market Complex"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>City</label>
                    <input 
                      type="text" 
                      value={storeConfig.city}
                      onChange={(e) => setStoreConfig({ ...storeConfig, city: e.target.value })}
                      placeholder="e.g. Mumbai"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>State</label>
                    <input 
                      type="text" 
                      value={storeConfig.state}
                      onChange={(e) => setStoreConfig({ ...storeConfig, state: e.target.value })}
                      placeholder="e.g. Maharashtra"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>Postal Pincode</label>
                    <input 
                      type="text" 
                      value={storeConfig.pincode}
                      onChange={(e) => setStoreConfig({ ...storeConfig, pincode: e.target.value })}
                      placeholder="e.g. 400001"
                    />
                  </div>
                </div>

                <div className="form-fields-grid-2" style={{ marginTop: '1rem' }}>
                  <div className="form-group-item">
                    <label>Google Maps Showroom Link</label>
                    <input 
                      type="text" 
                      value={storeConfig.mapLink}
                      onChange={(e) => setStoreConfig({ ...storeConfig, mapLink: e.target.value })}
                      placeholder="e.g. https://maps.google.com/?q=..."
                    />
                  </div>

                  <div className="form-group-item">
                    <label>Showroom Operating Hours</label>
                    <input 
                      type="text" 
                      value={storeConfig.operatingHours}
                      onChange={(e) => setStoreConfig({ ...storeConfig, operatingHours: e.target.value })}
                      placeholder="e.g. Mon - Sat: 9:30 AM - 8:30 PM (Sunday Closed)"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-SECTION 5: GST & COMPLIANCE */}
            {settingsSection === 'compliance' && (
              <div className="settings-card-block">
                <div className="block-header">
                  <h3>GST, Legal Entity & Business Compliance</h3>
                  <p>Build buyer trust with verified GSTIN, Legal Entity info, and Input Tax Credit eligibility.</p>
                </div>

                <div className="form-fields-grid-2">
                  <div className="form-group-item">
                    <label>Legal Business Name (Registered Entity)</label>
                    <input 
                      type="text" 
                      value={storeConfig.legalName}
                      onChange={(e) => setStoreConfig({ ...storeConfig, legalName: e.target.value })}
                      placeholder="e.g. Apex Commercial Pvt Ltd"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>GSTIN (15-Character GST Identification Number)</label>
                    <input 
                      type="text" 
                      value={storeConfig.gstin}
                      onChange={(e) => setStoreConfig({ ...storeConfig, gstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 27AABCU9603R1ZM"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>Income Tax PAN Number</label>
                    <input 
                      type="text" 
                      value={storeConfig.panNumber}
                      onChange={(e) => setStoreConfig({ ...storeConfig, panNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g. AABCU9603R"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>MSME / Udyam Registration Number (Optional)</label>
                    <input 
                      type="text" 
                      value={storeConfig.msmeNumber}
                      onChange={(e) => setStoreConfig({ ...storeConfig, msmeNumber: e.target.value })}
                      placeholder="e.g. UDYAM-MH-01-0089123"
                    />
                  </div>
                </div>

                <div className="toggle-options-group" style={{ marginTop: '1.25rem' }}>
                  <label className="toggle-item-row">
                    <input 
                      type="checkbox" 
                      checked={storeConfig.showGstBreakdown}
                      onChange={(e) => setStoreConfig({ ...storeConfig, showGstBreakdown: e.target.checked })}
                    />
                    <span>
                      <strong>Show GST Tax Breakdown on Products & Checkout</strong>
                      <small>Displays HSN codes, Tax rates (12%, 18%), and Input Tax Credit (ITC) claimable note.</small>
                    </span>
                  </label>

                  <label className="toggle-item-row">
                    <input 
                      type="checkbox" 
                      checked={storeConfig.showGstBadge}
                      onChange={(e) => setStoreConfig({ ...storeConfig, showGstBadge: e.target.checked })}
                    />
                    <span>
                      <strong>Display "GST Verified Merchant" Seal on Storefront</strong>
                      <small>Adds official green checkmark badge next to your showroom title.</small>
                    </span>
                  </label>
                </div>

                <div className="form-group-item" style={{ marginTop: '1rem' }}>
                  <label>Return & Warranty Policy Note</label>
                  <textarea 
                    rows={2}
                    value={storeConfig.returnPolicy}
                    onChange={(e) => setStoreConfig({ ...storeConfig, returnPolicy: e.target.value })}
                    placeholder="e.g. 7-Day replacement on damaged or defective items with verified unboxing video."
                  />
                </div>
              </div>
            )}

            {/* SUB-SECTION 6: SHIPPING & DELIVERABLE PINCODES */}
            {settingsSection === 'shipping' && (
              <div className="settings-card-block">
                <div className="block-header">
                  <h3>Shipping, Delivery Rules & Deliverable Pincodes</h3>
                  <p>Configure minimum order thresholds, free shipping limits, and deliverable postal zones.</p>
                </div>

                <div className="form-fields-grid-3">
                  <div className="form-group-item">
                    <label>Minimum Order Value (₹)</label>
                    <input 
                      type="number" 
                      value={storeConfig.minOrderValue}
                      onChange={(e) => setStoreConfig({ ...storeConfig, minOrderValue: e.target.value })}
                      placeholder="e.g. 299"
                    />
                    <small style={{ color: '#64748b' }}>Orders below this amount cannot proceed.</small>
                  </div>

                  <div className="form-group-item">
                    <label>Free Delivery Threshold (₹)</label>
                    <input 
                      type="number" 
                      value={storeConfig.freeDeliveryAbove}
                      onChange={(e) => setStoreConfig({ ...storeConfig, freeDeliveryAbove: e.target.value })}
                      placeholder="e.g. 999"
                    />
                    <small style={{ color: '#64748b' }}>Zero delivery fee when order meets this amount.</small>
                  </div>

                  <div className="form-group-item">
                    <label>Flat Shipping Fee (₹)</label>
                    <input 
                      type="number" 
                      value={storeConfig.flatShippingFee}
                      onChange={(e) => setStoreConfig({ ...storeConfig, flatShippingFee: e.target.value })}
                      placeholder="e.g. 50"
                    />
                    <small style={{ color: '#64748b' }}>Charged for orders under free delivery threshold.</small>
                  </div>
                </div>

                <div className="form-fields-grid-2" style={{ marginTop: '1rem' }}>
                  <div className="form-group-item">
                    <label>Estimated Delivery Timeframe</label>
                    <input 
                      type="text" 
                      value={storeConfig.deliveryDays}
                      onChange={(e) => setStoreConfig({ ...storeConfig, deliveryDays: e.target.value })}
                      placeholder="e.g. 1-3 Business Days or Same-Day Dispatch"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>Deliverable Pincodes List (Comma Separated)</label>
                    <input 
                      type="text" 
                      value={storeConfig.deliverablePincodes}
                      onChange={(e) => setStoreConfig({ ...storeConfig, deliverablePincodes: e.target.value })}
                      placeholder="e.g. 400001, 400002, 110001 (Leave blank for ALL-INDIA delivery)"
                    />
                    <small style={{ color: '#64748b' }}>Leave blank to allow all 6-digit Indian postal codes.</small>
                  </div>
                </div>

                <div className="toggle-options-group" style={{ marginTop: '1.25rem' }}>
                  <label className="toggle-item-row">
                    <input 
                      type="checkbox" 
                      checked={storeConfig.enableStorePickup}
                      onChange={(e) => setStoreConfig({ ...storeConfig, enableStorePickup: e.target.checked })}
                    />
                    <span>
                      <strong>Enable Free Local Showroom Counter Pickup</strong>
                      <small>Customers can choose to collect their order directly from your showroom counter.</small>
                    </span>
                  </label>

                  <label className="toggle-item-row">
                    <input 
                      type="checkbox" 
                      checked={storeConfig.expressDelivery}
                      onChange={(e) => setStoreConfig({ ...storeConfig, expressDelivery: e.target.checked })}
                    />
                    <span>
                      <strong>Same-Day / Express Delivery Badge</strong>
                      <small>Shows "⚡ Express Delivery Available" banner on product cards.</small>
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* SUB-SECTION 7: PAYMENTS & INSTANT UPI QR */}
            {settingsSection === 'payments' && (
              <div className="settings-card-block">
                <div className="block-header">
                  <h3>Payment Methods & Contactless UPI QR</h3>
                  <p>Accept instant payments via dynamic UPI QR code, Cash on Delivery, or Bank IMPS/NEFT.</p>
                </div>

                <div className="form-group-item">
                  <label>Merchant UPI ID (Generates Scannable UPI QR on Checkout)</label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={storeConfig.upiId}
                      onChange={(e) => setStoreConfig({ ...storeConfig, upiId: e.target.value })}
                      placeholder="e.g. businessname@okaxis, 9876543210@paytm, merchant@upi"
                      style={{ flex: 1 }}
                    />
                    <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>
                      ✓ UPI Active
                    </div>
                  </div>
                  <small style={{ color: '#64748b', marginTop: '0.3rem' }}>
                    Customers can scan the QR code generated directly inside the cart with Google Pay, PhonePe, Paytm, or BHIM.
                  </small>
                </div>

                <div className="form-fields-grid-2" style={{ marginTop: '1.25rem' }}>
                  <div className="form-group-item">
                    <label>Bank Account Holder Name</label>
                    <input 
                      type="text" 
                      value={storeConfig.bankHolderName}
                      onChange={(e) => setStoreConfig({ ...storeConfig, bankHolderName: e.target.value })}
                      placeholder="e.g. Apex Commercial Solutions"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>Bank Account Number</label>
                    <input 
                      type="text" 
                      value={storeConfig.bankAccountNo}
                      onChange={(e) => setStoreConfig({ ...storeConfig, bankAccountNo: e.target.value })}
                      placeholder="e.g. 50200088991122"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>Bank IFSC Code</label>
                    <input 
                      type="text" 
                      value={storeConfig.bankIfsc}
                      onChange={(e) => setStoreConfig({ ...storeConfig, bankIfsc: e.target.value.toUpperCase() })}
                      placeholder="e.g. HDFC0000123"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>Bank Name & Branch</label>
                    <input 
                      type="text" 
                      value={storeConfig.bankName}
                      onChange={(e) => setStoreConfig({ ...storeConfig, bankName: e.target.value })}
                      placeholder="e.g. HDFC Bank, Fort Branch"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-SECTION 8: PROMOTIONS, COUPONS & BULK DISCOUNTS */}
            {settingsSection === 'promotions' && (
              <div className="settings-card-block">
                <div className="block-header">
                  <h3>Promotional Banners, Discount Coupons & Bulk Wholesale</h3>
                  <p>Drive customer conversions with sitewide announcement marquees and active promo coupons.</p>
                </div>

                {/* Announcement Ticker */}
                <div className="promo-config-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <label style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      Top Announcement Marquee Bar
                    </label>
                    <label className="catalog-switch">
                      <input 
                        type="checkbox" 
                        checked={storeConfig.announcementActive}
                        onChange={(e) => setStoreConfig({ ...storeConfig, announcementActive: e.target.checked })}
                      />
                      <span className="catalog-slider"></span>
                    </label>
                  </div>
                  <input 
                    type="text" 
                    value={storeConfig.announcementText}
                    onChange={(e) => setStoreConfig({ ...storeConfig, announcementText: e.target.value })}
                    placeholder="e.g. ⚡ Festive Wholesale Offer: Get Free Express Delivery on orders above ₹999!"
                  />
                </div>

                {/* Promo Coupon */}
                <div className="promo-config-box" style={{ marginTop: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 700 }}>
                    Active Customer Promo Coupon Code
                  </h4>

                  <div className="form-fields-grid-3">
                    <div className="form-group-item">
                      <label>Coupon Code</label>
                      <input 
                        type="text" 
                        value={storeConfig.promoCoupon}
                        onChange={(e) => setStoreConfig({ ...storeConfig, promoCoupon: e.target.value.toUpperCase() })}
                        placeholder="e.g. WELCOME10"
                      />
                    </div>

                    <div className="form-group-item">
                      <label>Discount Type</label>
                      <select 
                        value={storeConfig.couponType}
                        onChange={(e) => setStoreConfig({ ...storeConfig, couponType: e.target.value })}
                        className="catalog-select"
                      >
                        <option value="percentage">Percentage (% OFF)</option>
                        <option value="flat">Flat Amount (₹ OFF)</option>
                      </select>
                    </div>

                    <div className="form-group-item">
                      <label>Discount Value</label>
                      <input 
                        type="number" 
                        value={storeConfig.couponValue}
                        onChange={(e) => setStoreConfig({ ...storeConfig, couponValue: Number(e.target.value) })}
                        placeholder="e.g. 10"
                      />
                    </div>
                  </div>

                  <div className="form-group-item" style={{ marginTop: '0.75rem' }}>
                    <label>Minimum Order Cart Value to Apply Coupon (₹)</label>
                    <input 
                      type="number" 
                      value={storeConfig.couponMinOrder}
                      onChange={(e) => setStoreConfig({ ...storeConfig, couponMinOrder: Number(e.target.value) })}
                      placeholder="e.g. 499"
                    />
                  </div>
                </div>

                {/* Bulk Wholesale Discount */}
                <div className="promo-config-box" style={{ marginTop: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <label style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      Automatic Bulk Wholesale Tier Discount
                    </label>
                    <label className="catalog-switch">
                      <input 
                        type="checkbox" 
                        checked={storeConfig.bulkDiscountActive}
                        onChange={(e) => setStoreConfig({ ...storeConfig, bulkDiscountActive: e.target.checked })}
                      />
                      <span className="catalog-slider"></span>
                    </label>
                  </div>

                  <div className="form-fields-grid-2">
                    <div className="form-group-item">
                      <label>Minimum Order Value for Bulk Discount (₹)</label>
                      <input 
                        type="number" 
                        value={storeConfig.bulkMinOrder}
                        onChange={(e) => setStoreConfig({ ...storeConfig, bulkMinOrder: Number(e.target.value) })}
                        placeholder="e.g. 5000"
                      />
                    </div>

                    <div className="form-group-item">
                      <label>Bulk Discount Percentage (% OFF)</label>
                      <input 
                        type="number" 
                        value={storeConfig.bulkDiscountPct}
                        onChange={(e) => setStoreConfig({ ...storeConfig, bulkDiscountPct: Number(e.target.value) })}
                        placeholder="e.g. 5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-SECTION 9: STORE OPERATIONAL STATUS */}
            {settingsSection === 'status' && (
              <div className="settings-card-block">
                <div className="block-header">
                  <h3>Store Operational Status & Vacation Mode</h3>
                  <p>Pause ordering during holidays or annual physical inventory stock audits.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <label className="catalog-switch">
                    <input 
                      type="checkbox" 
                      checked={storeConfig.isOnline}
                      onChange={(e) => setStoreConfig({ ...storeConfig, isOnline: e.target.checked })}
                    />
                    <span className="catalog-slider"></span>
                  </label>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: storeConfig.isOnline ? '#10b981' : '#f59e0b' }}>
                      {storeConfig.isOnline ? 'Online & Taking Orders' : 'Store Paused (Vacation Mode Active)'}
                    </h4>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                      {storeConfig.isOnline ? 'Customers can browse products and checkout on WhatsApp or web.' : 'Ordering is paused. A polite banner will inform buyers.'}
                    </p>
                  </div>
                </div>

                {!storeConfig.isOnline && (
                  <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                    <label>Vacation Notice Message Displayed to Customers</label>
                    <textarea 
                      rows={3}
                      value={storeConfig.vacationMessage}
                      onChange={(e) => setStoreConfig({ ...storeConfig, vacationMessage: e.target.value })}
                      placeholder="e.g. Our showroom is currently closed for annual inventory counting. We will reopen and dispatch orders soon!"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: MARKETING STUDIO */}
      {activeTab === 'marketing' && (
        <div className="catalog-glass-card">
          <div className="catalog-section-header">
            <div className="section-title-wrap">
              <h2>QR & WhatsApp Marketing Studio</h2>
              <p>Promote your digital catalog with printable table standees and viral WhatsApp broadcast templates.</p>
            </div>
          </div>

          <div className="marketing-cards-grid">
            {/* Counter Standee Card */}
            <div className="marketing-feature-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Printer size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Printable QR Counter Standee</h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Ideal for retail counters, cash desks & trade shows</p>
                </div>
              </div>

              <div className="standee-preview-box">
                <div className="standee-qr-frame">
                  <QRCodeSVG value={publicStoreUrl} size={120} level="H" includeMargin={true} fgColor="#0f172a" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{storeConfig.storeName}</div>
                <div style={{ fontSize: '0.78rem', color: '#38bdf8' }}>SCAN TO VIEW CATALOG & ORDER</div>
              </div>

              <button className="btn btn-primary" onClick={() => setShowQRModal(true)} style={{ width: '100%' }}>
                <Printer size={16} /> Open & Print Standee
              </button>
            </div>

            {/* WhatsApp Broadcast Template */}
            <div className="marketing-feature-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>WhatsApp Broadcast Message</h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Ready-to-send template for customer groups</p>
                </div>
              </div>

              <div className="whatsapp-template-box">
{`🌟 *Exciting News from ${storeConfig.storeName}!*

We are pleased to introduce our *Official Digital Catalog & Online Store*! 🚀

🛍️ *What you can do:*
✅ Browse 100% verified live stock & factory rates
✅ Check latest product specifications & discounts
✅ Order directly via WhatsApp with 1 click!

👉 *Visit our Online Catalog now:*
${publicStoreUrl}

🚚 *Special Offer:* Free delivery on orders above ₹${storeConfig.freeDeliveryAbove}!`}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    const text = `🌟 *Exciting News from ${storeConfig.storeName}!*\n\nWe are pleased to introduce our Official Digital Catalog & Online Store! 🚀\n\n👉 View live catalog & order:\n${publicStoreUrl}\n\n🚚 Free delivery on orders above ₹${storeConfig.freeDeliveryAbove}!`;
                    navigator.clipboard.writeText(text);
                    alert("Template copied to clipboard!");
                  }}
                >
                  <Copy size={16} /> Copy Text
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  onClick={handleShareWhatsApp}
                >
                  <Share2 size={16} /> Send on WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="admin-modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>
                <Edit3 size={18} color="#0284c7" /> Edit Catalog Product
              </h3>
              <button className="admin-modal-close" onClick={() => setEditingProduct(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedProduct}>
              <div className="admin-modal-body">
                <div className="form-group-item">
                  <label>Product Title / Name *</label>
                  <input 
                    type="text" 
                    value={editingProduct.name || ''} 
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    required 
                  />
                </div>

                <div className="form-fields-grid-2">
                  <div className="form-group-item">
                    <label>Selling Price (₹) *</label>
                    <input 
                      type="number" 
                      value={editingProduct.sellingPrice ?? ''} 
                      onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="form-group-item">
                    <label>MRP Strike-through Price (₹)</label>
                    <input 
                      type="number" 
                      value={editingProduct.mrp ?? ''} 
                      onChange={(e) => setEditingProduct({ ...editingProduct, mrp: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-fields-grid-2">
                  <div className="form-group-item">
                    <label>Available Stock</label>
                    <input 
                      type="number" 
                      value={editingProduct.stock ?? ''} 
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Measurement Unit</label>
                    <select 
                      className="catalog-select"
                      value={editingProduct.unit || 'Pieces (PCS)'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    >
                      <option value="Pieces (PCS)">Pieces (PCS)</option>
                      <option value="Packs (PAC)">Packs (PAC)</option>
                      <option value="Rolls (ROL)">Rolls (ROL)</option>
                      <option value="Boxes (BOX)">Boxes (BOX)</option>
                      <option value="Kilograms (KG)">Kilograms (KG)</option>
                      <option value="Meters (MTR)">Meters (MTR)</option>
                    </select>
                  </div>
                </div>

                <div className="form-fields-grid-2">
                  <div className="form-group-item">
                    <label>Category / Product Group</label>
                    <input 
                      type="text" 
                      value={editingProduct.productGroup || ''} 
                      onChange={(e) => setEditingProduct({ ...editingProduct, productGroup: e.target.value })}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Promotional Badge Ribbon</label>
                    <select 
                      className="catalog-select"
                      value={editingProduct.catalogBadge || 'none'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, catalogBadge: e.target.value })}
                    >
                      <option value="none">No Badge</option>
                      <option value="bestseller">⭐ Bestseller</option>
                      <option value="hot">🔥 Hot Deal</option>
                      <option value="new">🚀 New Arrival</option>
                      <option value="featured">💎 Featured</option>
                    </select>
                  </div>
                </div>

                <div className="form-fields-grid-2">
                  <div className="form-group-item">
                    <label>HSN Code</label>
                    <input 
                      type="text" 
                      value={editingProduct.hsn || ''} 
                      onChange={(e) => setEditingProduct({ ...editingProduct, hsn: e.target.value })}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>GST Tax Rate (%)</label>
                    <select 
                      className="catalog-select"
                      value={editingProduct.taxRate ?? 18}
                      onChange={(e) => setEditingProduct({ ...editingProduct, taxRate: Number(e.target.value) })}
                    >
                      <option value={0}>0% (Tax Exempt)</option>
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST</option>
                      <option value={28}>28% GST</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-item">
                  <label>Product Image URL</label>
                  <input 
                    type="url" 
                    value={editingProduct.image || ''} 
                    onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                    placeholder="https://..."
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', alignItems: 'center' }}>
                    <label 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                    >
                      <Upload size={13} /> Upload Local Image
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const dataUrl = await compressImageFile(file, 800, 800, 0.85);
                            setEditingProduct(prev => ({ ...prev, image: dataUrl }));
                          } catch (err) {
                            console.error(err);
                          }
                          e.target.value = '';
                        }} 
                      />
                    </label>
                    {editingProduct.image && (
                      <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                        <img src={editingProduct.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Or choose sample retail hardware photo:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {CURATED_IMAGE_PRESETS.map((preset, idx) => (
                        <button 
                          key={idx}
                          type="button"
                          onClick={() => setEditingProduct({ ...editingProduct, image: preset.url })}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            border: editingProduct.image === preset.url ? '1px solid #0284c7' : '1px solid #cbd5e1',
                            background: editingProduct.image === preset.url ? '#f0f9ff' : '#ffffff',
                            color: editingProduct.image === preset.url ? '#0284c7' : '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-group-item">
                  <label>Product Description & Key Specifications</label>
                  <textarea 
                    rows={3} 
                    value={editingProduct.description || ''} 
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label className="catalog-switch">
                    <input 
                      type="checkbox" 
                      checked={editingProduct.isPublished !== false}
                      onChange={(e) => setEditingProduct({ ...editingProduct, isPublished: e.target.checked })}
                    />
                    <span className="catalog-slider"></span>
                  </label>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                    Show in Public Digital Catalog
                  </span>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingProduct(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW PRODUCT MODAL */}
      {showAddProductModal && (
        <div className="admin-modal-overlay" onClick={() => setShowAddProductModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>
                <Plus size={18} color="#0284c7" /> Add New Catalog Product
              </h3>
              <button className="admin-modal-close" onClick={() => setShowAddProductModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateNewProduct}>
              <div className="admin-modal-body">
                <div className="form-group-item">
                  <label>Product Title / Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Wireless Barcode Scanner 2D"
                    value={newProductForm.name} 
                    onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                    required 
                  />
                </div>

                <div className="form-fields-grid-2">
                  <div className="form-group-item">
                    <label>Selling Price (₹) *</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 1999"
                      value={newProductForm.sellingPrice} 
                      onChange={(e) => setNewProductForm({ ...newProductForm, sellingPrice: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="form-group-item">
                    <label>MRP Strike-through Price (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 2999"
                      value={newProductForm.mrp} 
                      onChange={(e) => setNewProductForm({ ...newProductForm, mrp: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-fields-grid-2">
                  <div className="form-group-item">
                    <label>Opening Stock</label>
                    <input 
                      type="number" 
                      value={newProductForm.stock} 
                      onChange={(e) => setNewProductForm({ ...newProductForm, stock: e.target.value })}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Measurement Unit</label>
                    <select 
                      className="catalog-select"
                      value={newProductForm.unit}
                      onChange={(e) => setNewProductForm({ ...newProductForm, unit: e.target.value })}
                    >
                      <option value="Pieces (PCS)">Pieces (PCS)</option>
                      <option value="Packs (PAC)">Packs (PAC)</option>
                      <option value="Rolls (ROL)">Rolls (ROL)</option>
                      <option value="Boxes (BOX)">Boxes (BOX)</option>
                      <option value="Kilograms (KG)">Kilograms (KG)</option>
                      <option value="Meters (MTR)">Meters (MTR)</option>
                    </select>
                  </div>
                </div>

                <div className="form-fields-grid-2">
                  <div className="form-group-item">
                    <label>Category / Product Group</label>
                    <input 
                      type="text" 
                      placeholder="e.g. POS Hardware"
                      value={newProductForm.productGroup} 
                      onChange={(e) => setNewProductForm({ ...newProductForm, productGroup: e.target.value })}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Promotional Badge</label>
                    <select 
                      className="catalog-select"
                      value={newProductForm.catalogBadge}
                      onChange={(e) => setNewProductForm({ ...newProductForm, catalogBadge: e.target.value })}
                    >
                      <option value="none">No Badge</option>
                      <option value="bestseller">⭐ Bestseller</option>
                      <option value="hot">🔥 Hot Deal</option>
                      <option value="new">🚀 New Arrival</option>
                      <option value="featured">💎 Featured</option>
                    </select>
                  </div>
                </div>

                <div className="form-fields-grid-2">
                  <div className="form-group-item">
                    <label>HSN Code</label>
                    <input 
                      type="text" 
                      placeholder="8471"
                      value={newProductForm.hsn} 
                      onChange={(e) => setNewProductForm({ ...newProductForm, hsn: e.target.value })}
                    />
                  </div>
                  <div className="form-group-item">
                    <label>GST Tax Rate (%)</label>
                    <select 
                      className="catalog-select"
                      value={newProductForm.taxRate}
                      onChange={(e) => setNewProductForm({ ...newProductForm, taxRate: Number(e.target.value) })}
                    >
                      <option value={0}>0% (Tax Exempt)</option>
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST</option>
                      <option value={28}>28% GST</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-item">
                  <label>Product Image URL</label>
                  <input 
                    type="url" 
                    placeholder="https://images.unsplash.com/..."
                    value={newProductForm.image} 
                    onChange={(e) => setNewProductForm({ ...newProductForm, image: e.target.value })}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', alignItems: 'center' }}>
                    <label 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                    >
                      <Upload size={13} /> Upload Local Image
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const dataUrl = await compressImageFile(file, 800, 800, 0.85);
                            setNewProductForm(prev => ({ ...prev, image: dataUrl }));
                          } catch (err) {
                            console.error(err);
                          }
                          e.target.value = '';
                        }} 
                      />
                    </label>
                    {newProductForm.image && (
                      <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                        <img src={newProductForm.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Or choose sample retail hardware photo:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {CURATED_IMAGE_PRESETS.map((preset, idx) => (
                        <button 
                          key={idx}
                          type="button"
                          onClick={() => setNewProductForm({ ...newProductForm, image: preset.url })}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            border: newProductForm.image === preset.url ? '1px solid #0284c7' : '1px solid #cbd5e1',
                            background: newProductForm.image === preset.url ? '#f0f9ff' : '#ffffff',
                            color: newProductForm.image === preset.url ? '#0284c7' : '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-group-item">
                  <label>Product Description & Highlights</label>
                  <textarea 
                    rows={3} 
                    placeholder="Mention product specifications, warranty, compatibility..."
                    value={newProductForm.description} 
                    onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddProductModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={15} /> Add to Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER INSPECTION / DETAILS MODAL */}
      {selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>
                <ShoppingBag size={18} color="#0284c7" /> Order #{selectedOrder.orderId || selectedOrder.id}
              </h3>
              <button className="admin-modal-close" onClick={() => setSelectedOrder(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="admin-modal-body">
              {/* Order Meta Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Date & Time</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : 'Recent'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Payment Mode</div>
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', color: '#0284c7' }}>
                    {selectedOrder.paymentMode || 'WhatsApp / COD'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Order Status</div>
                  <select 
                    className="catalog-select"
                    style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', fontWeight: 700 }}
                    value={selectedOrder.status || 'New Inquiry'}
                    onChange={(e) => {
                      const newSt = e.target.value;
                      handleUpdateOrderStatus(selectedOrder.id || selectedOrder.orderId, newSt);
                      setSelectedOrder({ ...selectedOrder, status: newSt });
                    }}
                  >
                    <option value="New Inquiry">🔵 New Inquiry</option>
                    <option value="Contacted">🟡 Contacted</option>
                    <option value="Invoiced">📄 Invoiced</option>
                    <option value="Dispatched">🚚 Dispatched</option>
                    <option value="Completed">✅ Completed</option>
                  </select>
                </div>
              </div>

              {/* Customer Contact Box */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <UserCheck size={16} color="#0284c7" /> Customer Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Name:</span>{' '}
                    <strong>{selectedOrder.customerName || 'Anonymous Customer'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Phone:</span>{' '}
                    <strong style={{ color: '#0284c7' }}>{selectedOrder.customerPhone || 'N/A'}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#64748b' }}>Delivery Address:</span>{' '}
                    <span>{selectedOrder.customerAddress || 'Pickup / Store Direct'}</span>
                  </div>
                  {selectedOrder.customerNote && (
                    <div style={{ gridColumn: '1 / -1', background: '#fef3c7', padding: '0.5rem 0.75rem', borderRadius: '8px', color: '#92400e' }}>
                      <strong>Customer Note:</strong> {selectedOrder.customerNote}
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#0f172a' }}>
                  Ordered Items ({selectedOrder.items?.length || 0})
                </h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Item</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Price</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || []).map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{it.name}</div>
                            {it.unit && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Unit: {it.unit}</div>}
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>
                            {it.quantity}
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#64748b' }}>
                            ₹{Number(it.price || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            ₹{(Number(it.price || 0) * (it.quantity || 1)).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '0.75rem', gap: '0.25rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', color: '#64748b' }}>
                    <span>Subtotal:</span>
                    <span>₹{Number(selectedOrder.subtotal || selectedOrder.totalAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {selectedOrder.discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', color: '#16a34a' }}>
                      <span>Discount ({selectedOrder.couponCode || 'PROMO'}):</span>
                      <span>-₹{Number(selectedOrder.discountAmount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedOrder.shippingFee !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', color: '#64748b' }}>
                      <span>Shipping:</span>
                      <span>{Number(selectedOrder.shippingFee) === 0 ? 'FREE' : `₹${selectedOrder.shippingFee}`}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                    <span>Grand Total:</span>
                    <span style={{ color: '#0284c7' }}>₹{Number(selectedOrder.totalAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => window.print()}
                title="Print Packing Slip / Receipt"
              >
                <Printer size={15} /> Print Slip
              </button>
              {selectedOrder.customerPhone && (
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => window.open(`https://wa.me/${selectedOrder.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${selectedOrder.customerName}, regarding Order #${selectedOrder.orderId || selectedOrder.id} from ${storeConfig.storeName}...`)}`, '_blank')}
                >
                  <MessageCircle size={15} /> WhatsApp Customer
                </button>
              )}
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ color: '#ef4444', borderColor: '#fee2e2' }}
                onClick={() => handleDeleteOrder(selectedOrder.id || selectedOrder.orderId)}
                title="Delete this order record"
              >
                <Trash2 size={15} /> Delete Order
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  const ord = selectedOrder;
                  setSelectedOrder(null);
                  handleConvertToInvoice(ord);
                }}
              >
                <FileCheck2 size={16} /> Convert to GST Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR STANDEE MODAL */}
      <QRStandeeModal 
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        storeConfig={storeConfig}
        storeUrl={publicStoreUrl}
      />
    </div>
  );
};

export default DigitalCatalogAdmin;
