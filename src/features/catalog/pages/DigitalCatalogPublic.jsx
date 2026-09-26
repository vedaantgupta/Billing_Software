import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Store, ShoppingBag, Search, Filter, Phone, MessageCircle, Share2, 
  Check, Plus, Minus, Trash2, X, ArrowRight, ShieldCheck, Truck, 
  Sparkles, Star, Flame, Eye, ChevronRight, CheckCircle2, Copy, 
  MapPin, Clock, Award, CreditCard, ExternalLink, HelpCircle, Tag,
  QrCode, AlertCircle, Percent, Heart, Info, PhoneCall, Building2,
  FileCheck2, CheckSquare, SearchCheck, LayoutGrid, List, RotateCcw
} from 'lucide-react';
import { getDB, getItems, addItem } from '@/utils/db';
import { QRCodeSVG } from 'qrcode.react';
import '@/features/catalog/styles/DigitalCatalogPublic.css';

const DEFAULT_CATALOG_PRODUCTS = [
  {
    id: 'prod-scanner-2d',
    name: 'Pro Wireless 2D High-Speed QR & Barcode Scanner',
    description: 'Industrial-grade wireless optical barcode reader with 32-bit ARM decoder, 30-meter Bluetooth 5.2 range, and shockproof drop-resistant housing. Designed for superfast retail checkout counters and warehouse logistics.',
    sellingPrice: 2499,
    mrp: 3999,
    stock: 24,
    unit: 'PCS',
    hsn: '8471',
    taxRate: 18,
    productGroup: 'Electronics & Hardware',
    catalogBadge: 'bestseller',
    brand: 'Apex Tech',
    isPublished: true,
    image: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'prod-printer-thermal',
    name: 'Thermal Billing Receipt Printer 80mm (Auto-Cutter, USB + LAN + Bluetooth)',
    description: 'Ultra-fast 260mm/sec thermal POS receipt printer compatible with all billing software, Android POS apps, and desktop computers. Features sharp japanese print head and auto paper cutter.',
    sellingPrice: 3850,
    mrp: 5500,
    stock: 16,
    unit: 'PCS',
    hsn: '8443',
    taxRate: 18,
    productGroup: 'POS & Billing Hardware',
    catalogBadge: 'hot',
    brand: 'PosMaster',
    isPublished: true,
    image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'prod-cash-drawer',
    name: 'Heavy-Duty Electronic Cash Drawer (5 Bill / 8 Coin Trays, RJ11)',
    description: 'Solid cold-rolled steel construction with 3-position key lock and RJ11 printer trigger cable. Built for commercial superstore cash counters with 1,000,000+ open cycle lifespan.',
    sellingPrice: 2199,
    mrp: 3200,
    stock: 12,
    unit: 'PCS',
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
    unit: 'Rolls',
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
    name: 'High-Precision Commercial Digital Weighing Scale (30Kg, Dual LED)',
    description: 'Govt legal metrology approved electronic retail counter scale. Features dual front & back LED weight/price display, rechargeable battery backup, and tare counting.',
    sellingPrice: 1890,
    mrp: 2800,
    stock: 14,
    unit: 'PCS',
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
    unit: 'Packs',
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

const DigitalCatalogPublic = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Find store owner user ID
  const storeUserId = id || 'default';
  const getProductUrl = (pId) => storeUserId && storeUserId !== 'default' ? `/catalog/${storeUserId}/product/${pId}` : `/catalog/product/${pId}`;

  // State
  const [storeConfig, setStoreConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Layout
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBadge, setSelectedBadge] = useState('all'); // 'all' | 'bestseller' | 'hot' | 'new' | 'featured'
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Wishlist
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('gogstbill_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const toggleWishlist = (productId) => {
    setWishlist(prev => {
      let updated;
      if (prev.includes(productId)) {
        updated = prev.filter(x => x !== productId);
      } else {
        updated = [...prev, productId];
      }
      try {
        localStorage.setItem('gogstbill_wishlist', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Cart State (stored in localStorage for customer convenience)
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem(`gogstbill_cart_${storeUserId}`);
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      return [];
    }
  });

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [orderConfirmed, setOrderConfirmed] = useState(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showStoreInfoModal, setShowStoreInfoModal] = useState(false);
  const [showOrderTrackerModal, setShowOrderTrackerModal] = useState(false);
  const [trackOrderId, setTrackOrderId] = useState('');
  const [trackedOrderResult, setTrackedOrderResult] = useState(null);
  const [trackError, setTrackError] = useState('');

  // Coupon & Payment Choice
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState({ text: '', isError: false });
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('whatsapp'); // 'whatsapp' | 'upi' | 'cod' | 'bank'

  // Customer Checkout Details with Persistent Auto-save
  const [customerDetails, setCustomerDetails] = useState(() => {
    try {
      const saved = localStorage.getItem('gogstbill_customer_info');
      return saved ? JSON.parse(saved) : { name: '', phone: '', address: '', city: '', note: '' };
    } catch (e) {
      return { name: '', phone: '', address: '', city: '', note: '' };
    }
  });

  const updateCustomerDetails = (field, val) => {
    setCustomerDetails(prev => {
      const updated = { ...prev, [field]: val };
      try {
        localStorage.setItem('gogstbill_customer_info', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Sync Cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`gogstbill_cart_${storeUserId}`, JSON.stringify(cart));
    } catch (e) {}
  }, [cart, storeUserId]);

  // Load Storefront & Products
  useEffect(() => {
    const fetchStoreData = async () => {
      setIsLoading(true);
      try {
        const savedConfig = localStorage.getItem(`gogstbill_catalog_config_${storeUserId}`);
        let config = null;
        if (savedConfig) {
          try { config = JSON.parse(savedConfig); } catch (e) {}
        }

        // Try checking any store config in localStorage if not found
        if (!config) {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('gogstbill_catalog_config_')) {
              try {
                const val = JSON.parse(localStorage.getItem(k));
                if (val && val.storeName) {
                  config = val;
                  break;
                }
              } catch (e) {}
            }
          }
        }

        const company = getDB()?.company || {};
        if (!config) {
          config = {
            template: 'flagship',
            storeName: company.name || 'Apex Commercial Emporium',
            tagline: 'Direct Manufacturer & Wholesale Distributor of Premium Commercial Goods',
            description: 'Welcome to our verified digital storefront. We supply direct factory wholesale inventory with full GST input tax credit (ITC), fast dispatch across India, and dedicated WhatsApp support.',
            phone: company.phone || '9876543210',
            whatsappNumber: company.phone || '9876543210',
            city: company.state || 'Mumbai, Maharashtra',
            address: company.address || 'Commercial Plaza, Market Boulevard',
            gstin: company.gstin || '27AABCU9603R1ZM',
            isOnline: true,
            freeDeliveryAbove: '999',
            flatShippingFee: '50',
            announcementActive: true,
            announcementText: '⚡ FACTORY WHOLESALE SALE: Free Express Delivery on orders over ₹999! Use code WELCOME10 for 10% OFF.',
            promoCoupon: 'WELCOME10',
            couponType: 'percentage',
            couponValue: 10,
            couponMinOrder: 499,
            bulkDiscountActive: true,
            bulkMinOrder: 5000,
            bulkDiscountPct: 5,
            upiId: 'merchant@okaxis',
            themePreset: 'cyber',
            logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
            bannerUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f156d?w=1600&auto=format&fit=crop&q=80',
            establishedYear: '2021',
            operatingHours: 'Mon - Sat: 9:30 AM to 8:30 PM'
          };
        }
        setStoreConfig(config);

        // Fetch products
        let prods = [];
        try {
          prods = await getItems('products', storeUserId);
        } catch (err) {
          prods = getDB()?.products || [];
        }

        if (!prods || prods.length === 0) {
          prods = getDB()?.products || [];
        }

        if (!prods || prods.length === 0) {
          prods = DEFAULT_CATALOG_PRODUCTS;
        }

        const publishedProds = prods.filter(p => p.isPublished !== false);
        setProducts(publishedProds.length > 0 ? publishedProds : prods);
      } catch (err) {
        console.error('Failed to load store data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStoreData();
  }, [storeUserId]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.productGroup || 'Others'));
    return ['all', ...Array.from(cats)];
  }, [products]);

  // Filtered & Sorted Products
  const displayedProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.productGroup || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || (p.productGroup || 'Others') === selectedCategory;
      const matchesBadge = selectedBadge === 'all' || p.catalogBadge === selectedBadge;
      const matchesWishlist = !showWishlistOnly || wishlist.includes(p.id);
      return matchesSearch && matchesCategory && matchesBadge && matchesWishlist;
    });

    if (sortBy === 'price-low') {
      result.sort((a, b) => Number(a.sellingPrice || 0) - Number(b.sellingPrice || 0));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => Number(b.sellingPrice || 0) - Number(a.sellingPrice || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return result;
  }, [products, searchQuery, selectedCategory, selectedBadge, showWishlistOnly, wishlist, sortBy]);

  // Cart Functions
  const addToCart = (product, customQty = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + customQty } : item);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: Number(product.sellingPrice || 0),
        mrp: Number(product.mrp || product.sellingPrice || 0),
        image: product.image,
        unit: product.unit || 'PCS',
        taxRate: Number(product.taxRate || 18),
        hsn: product.hsn || '',
        quantity: customQty
      }];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const getProductCartQty = (productId) => {
    const found = cart.find(item => item.id === productId);
    return found ? found.quantity : 0;
  };

  // Cart Totals Calculation
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const freeDeliveryThreshold = Number(storeConfig?.freeDeliveryAbove || 999);
  const isFreeDelivery = cartSubtotal >= freeDeliveryThreshold;
  const deliveryCharge = isFreeDelivery || cart.length === 0 ? 0 : Number(storeConfig?.flatShippingFee || 50);

  // Calculate Real Coupon Discount
  let couponDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      couponDiscountAmount = Math.round((cartSubtotal * appliedCoupon.value) / 100);
    } else {
      couponDiscountAmount = Math.min(cartSubtotal, appliedCoupon.value);
    }
  }

  // Automatic Bulk Order Discount
  let bulkDiscountAmount = 0;
  if (storeConfig?.bulkDiscountActive && cartSubtotal >= Number(storeConfig.bulkMinOrder || 5000)) {
    bulkDiscountAmount = Math.round((cartSubtotal * Number(storeConfig.bulkDiscountPct || 5)) / 100);
  }

  const totalDiscount = couponDiscountAmount + bulkDiscountAmount;
  const cartTotal = Math.max(0, cartSubtotal + deliveryCharge - totalDiscount);
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - cartSubtotal);
  const deliveryProgressPercent = Math.min(100, (cartSubtotal / freeDeliveryThreshold) * 100);

  // Apply Coupon Handler
  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponMessage({ text: 'Please enter a coupon code.', isError: true });
      return;
    }

    const configCoupon = (storeConfig?.promoCoupon || 'WELCOME10').toUpperCase();
    if (code !== configCoupon) {
      setCouponMessage({ text: `Invalid code "${code}". Try "${configCoupon}"!`, isError: true });
      return;
    }

    const minOrder = Number(storeConfig?.couponMinOrder || 0);
    if (cartSubtotal < minOrder) {
      setCouponMessage({ text: `Coupon requires minimum cart value of ₹${minOrder}.`, isError: true });
      return;
    }

    setAppliedCoupon({
      code,
      type: storeConfig?.couponType || 'percentage',
      value: Number(storeConfig?.couponValue || 10)
    });
    setCouponMessage({ text: `Coupon "${code}" applied successfully!`, isError: false });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponMessage({ text: '', isError: false });
  };

  // UPI Payment Link
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(storeConfig?.upiId || 'merchant@okaxis')}&pn=${encodeURIComponent(storeConfig?.storeName || 'Store')}&am=${cartTotal}&cu=INR`;

  // Checkout Option 1: Send on WhatsApp
  const handleCheckoutWhatsApp = async () => {
    if (cart.length === 0) return;

    if (!customerDetails.name.trim() || !customerDetails.phone.trim()) {
      alert("Please enter your Full Name and WhatsApp phone number to continue.");
      return;
    }

    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const itemsSummary = cart.map(it => `• ${it.quantity}x ${it.name} @ ₹${it.price.toLocaleString('en-IN')} = ₹${(it.price * it.quantity).toLocaleString('en-IN')}`).join('\n');

    const message = `🛒 *NEW DIGITAL STORE ORDER (#${orderId})*
---------------------------------------
🏢 *Store:* ${storeConfig?.storeName}
👤 *Customer Name:* ${customerDetails.name}
📞 *Customer Phone:* ${customerDetails.phone}
📍 *Delivery Address:* ${customerDetails.address || 'Showroom Pickup'}, ${customerDetails.city || ''}
💳 *Payment Mode:* ${selectedPaymentMode.toUpperCase()}
${customerDetails.note ? `💬 *Instructions / GSTIN:* ${customerDetails.note}\n` : ''}---------------------------------------
📦 *Items Ordered (${totalCartItems} total items):*
${itemsSummary}
---------------------------------------
💰 *Subtotal:* ₹${cartSubtotal.toLocaleString('en-IN')}
🚚 *Delivery:* ${isFreeDelivery ? 'FREE' : `₹${deliveryCharge}`}
${appliedCoupon ? `🏷️ *Coupon (${appliedCoupon.code}):* -₹${couponDiscountAmount.toLocaleString('en-IN')}\n` : ''}${bulkDiscountAmount > 0 ? `⚡ *Bulk Wholesale Discount:* -₹${bulkDiscountAmount.toLocaleString('en-IN')}\n` : ''}💵 *TOTAL AMOUNT:* ₹${cartTotal.toLocaleString('en-IN')}
---------------------------------------
_Sent via Official GoGSTBill Digital Catalog Platform_`;

    const recipientNumber = (storeConfig?.whatsappNumber || '919876543210').replace(/[^0-9]/g, '');
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${recipientNumber}&text=${encodeURIComponent(message)}`;

    await saveOrderToDB('WhatsApp Inquiry', orderId);
    window.open(whatsappUrl, '_blank');
  };

  // Checkout Option 2: Direct Order Placement
  const handleDirectOrder = async () => {
    if (cart.length === 0) return;

    if (!customerDetails.name.trim() || !customerDetails.phone.trim()) {
      alert("Please enter your Full Name and Phone Number to confirm your order.");
      return;
    }

    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    await saveOrderToDB(`Confirmed Online Order (${selectedPaymentMode.toUpperCase()})`, orderId);
  };

  const saveOrderToDB = async (status, customOrderId) => {
    const orderId = customOrderId || `ORD-${Date.now().toString().slice(-6)}`;
    const newOrder = {
      orderId,
      customerName: customerDetails.name,
      customerPhone: customerDetails.phone,
      customerAddress: `${customerDetails.address || ''} ${customerDetails.city || ''}`.trim(),
      customerNote: customerDetails.note,
      paymentMode: selectedPaymentMode,
      items: cart,
      subtotal: cartSubtotal,
      deliveryCharge,
      couponDiscount: couponDiscountAmount,
      bulkDiscount: bulkDiscountAmount,
      totalAmount: cartTotal,
      status: status || 'New Inquiry',
      createdAt: new Date().toISOString()
    };

    try {
      await addItem('catalogOrders', newOrder, storeUserId);
    } catch (e) {
      console.error('Failed to save catalog order:', e);
    }

    setOrderConfirmed(newOrder);
    setCart([]);
    setIsCartOpen(false);
  };

  // Share store link
  const handleShareStore = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  // Track Order Lookup
  const handleTrackOrder = async (e) => {
    e.preventDefault();
    setTrackError('');
    setTrackedOrderResult(null);

    const query = trackOrderId.trim().toUpperCase();
    if (!query) {
      setTrackError('Please enter an Order ID.');
      return;
    }

    try {
      const orders = await getItems('catalogOrders', storeUserId);
      const cleanQ = query.replace(/^#/, '');
      const found = (orders || []).find(o => 
        (o.orderId && o.orderId.toUpperCase().includes(cleanQ)) ||
        (o.id && String(o.id).toUpperCase().includes(cleanQ))
      );

      if (found) {
        setTrackedOrderResult(found);
      } else {
        setTrackError(`No active order found matching "${query}". Please check your order reference number.`);
      }
    } catch (err) {
      setTrackError('Unable to retrieve order details right now. Please message on WhatsApp for instant status.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <Store size={50} style={{ color: '#06b6d4', animation: 'bounce 1s infinite' }} />
          <p style={{ marginTop: '1.25rem', fontWeight: 800, letterSpacing: '0.04em', fontSize: '1.1rem' }}>
            CONNECTING TO SECURE STOREFRONT...
          </p>
        </div>
      </div>
    );
  }

  const activeTemplate = storeConfig?.template && storeConfig.template !== 'amazon' ? storeConfig.template : 'flagship';
  const heroBg = storeConfig?.bannerUrl || 'https://images.unsplash.com/photo-1541888946425-d0fbb18f156d?w=1600&auto=format&fit=crop&q=80';
  const logoImg = storeConfig?.logoUrl;
  const storeHomeUrl = storeUserId && storeUserId !== 'default' ? `/catalog/${storeUserId}` : '/catalog';

  return (
    <div className={`public-storefront-wrapper template-${activeTemplate}`}>
      {/* ANNOUNCEMENT TICKER */}
      {storeConfig?.announcementActive !== false && storeConfig?.announcementText && (
        <div className="storefront-top-ticker">
          <div className="ticker-track">
            <span className="ticker-item">
              <Sparkles size={14} /> {storeConfig.announcementText}
            </span>
            <span className="ticker-item">
              <ShieldCheck size={14} /> GST Tax Invoices Available for 100% ITC Benefit
            </span>
            <span className="ticker-item">
              <Truck size={14} /> Free Express Delivery on Orders Above ₹{storeConfig.freeDeliveryAbove || '999'}
            </span>
          </div>
        </div>
      )}

      {/* VACATION MODE BANNER */}
      {!storeConfig?.isOnline && (
        <div style={{ background: '#fef3c7', color: '#92400e', padding: '0.85rem 1.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.88rem', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{storeConfig?.vacationMessage || 'Store is currently in vacation mode. Orders are paused.'}</span>
        </div>
      )}

      {/* LUXURY STOREFRONT NAVBAR */}
      <header className="storefront-navbar">
        <div className="navbar-container">
          <div className="navbar-brand-col" onClick={() => navigate(storeHomeUrl)}>
            {logoImg ? (
              <img src={logoImg} alt={storeConfig?.storeName} className="store-logo-img" />
            ) : (
              <div className="store-logo-fallback">
                <Store size={22} />
              </div>
            )}
            <div className="store-titles">
              <h1 className="store-main-title">{storeConfig?.storeName}</h1>
              <div className="store-verified-strip">
                <span className="verified-seal">
                  <ShieldCheck size={13} /> GST Verified Merchant
                </span>
                <span className="store-rating-chip">
                  <Star size={11} fill="#f59e0b" color="#f59e0b" /> 4.9 (450+ Orders)
                </span>
              </div>
            </div>
          </div>

          {/* TEMPLATE-AWARE TOP ACTIONS */}
          <div className="navbar-actions-col">
            <button 
              className="btn-nav-action" 
              onClick={() => setShowOrderTrackerModal(true)} 
              title="Track Existing Order Status"
            >
              <SearchCheck size={15} />
              <span className="hide-on-mobile">Track Order</span>
            </button>

            <button 
              className="btn-nav-action" 
              onClick={() => setShowStoreInfoModal(true)} 
              title="Store Showroom & Contact"
            >
              <Building2 size={15} />
              <span className="hide-on-mobile">Showroom</span>
            </button>

            <button className="btn-nav-action" onClick={handleShareStore} title="Share Store Link">
              {copiedShare ? <Check size={15} color="#10b981" /> : <Share2 size={15} />}
              <span className="hide-on-mobile">{copiedShare ? 'Copied!' : 'Share'}</span>
            </button>

            <button 
              className="btn-nav-cart" 
              onClick={() => setIsCartOpen(true)}
              title="View Cart"
            >
              <ShoppingBag size={18} />
              <span className="hide-on-mobile">Cart</span>
              <span className="nav-cart-badge">{totalCartItems}</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SHOWROOM COVER BANNER */}
      <section className="store-hero-banner" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="store-hero-overlay"></div>
        <div className="store-hero-content">
          <span className="hero-tag-badge">
            <Sparkles size={14} /> OFFICIAL DIGITAL CATALOG & STOREFRONT
          </span>
          <h2 className="hero-heading">{storeConfig?.tagline || 'Direct Factory Wholesale & Retail Storefront'}</h2>
          <p className="hero-bio">{storeConfig?.description}</p>

          <div className="hero-badges-row">
            <div className="hero-badge-pill">
              <Truck size={14} /> Express Delivery Across India
            </div>
            <div className="hero-badge-pill">
              <ShieldCheck size={14} /> GSTIN: {storeConfig?.gstin || '27AABCU9603R1ZM'}
            </div>
            <div className="hero-badge-pill">
              <Award size={14} /> 100% Genuine Certified Goods
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CATALOG CONTENT CONTAINER */}
      <main className="catalog-main-content">
        {/* SEARCH, SORT & CATEGORIES */}
        <div className="catalog-controls-container">
          <div className="search-filter-row">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search products by title, model, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="sort-view-toggles">
              <select 
                className="sort-dropdown"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">Sort: Featured Picks</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Product Name (A-Z)</option>
              </select>

              <button 
                className={`btn-view-mode ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                className={`btn-view-mode ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>
          </div>

          {/* CURATED CATEGORY CHIPS */}
          <div className="categories-showcase-strip">
            {categories.map(cat => {
              const count = cat === 'all' 
                ? products.length 
                : products.filter(p => (p.productGroup || 'Others') === cat).length;
              return (
                <button
                  key={cat}
                  className={`category-card-chip ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span style={{ textTransform: 'capitalize' }}>{cat === 'all' ? 'All Products' : cat}</span>
                  <span className="category-chip-count">{count}</span>
                </button>
              );
            })}

            {/* Wishlist filter chip */}
            <button
              className={`category-card-chip ${showWishlistOnly ? 'active' : ''}`}
              onClick={() => setShowWishlistOnly(!showWishlistOnly)}
              style={{ borderColor: '#fca5a5' }}
            >
              <Heart size={14} fill={showWishlistOnly ? '#fff' : '#ef4444'} color={showWishlistOnly ? '#fff' : '#ef4444'} />
              <span>Wishlist</span>
              <span className="category-chip-count">{wishlist.length}</span>
            </button>
          </div>

          {/* BADGE FILTER PILLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>Filter Badge:</span>
            {[
              { id: 'all', label: 'All Items' },
              { id: 'bestseller', label: '⭐ Bestsellers' },
              { id: 'hot', label: '🔥 Hot Deals' },
              { id: 'new', label: '🚀 New Arrivals' },
              { id: 'featured', label: '💎 Featured' }
            ].map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBadge(b.id)}
                style={{
                  background: selectedBadge === b.id ? '#0f172a' : '#ffffff',
                  color: selectedBadge === b.id ? '#ffffff' : '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s'
                }}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* ACTIVE FILTER INDICATOR */}
          {(searchQuery || selectedCategory !== 'all' || selectedBadge !== 'all' || showWishlistOnly) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: '10px', marginTop: '0.75rem', fontSize: '0.82rem', color: '#475569', border: '1px solid #e2e8f0' }}>
              <span>
                Showing <strong>{displayedProducts.length}</strong> {displayedProducts.length === 1 ? 'item' : 'items'}
                {searchQuery && <> matching "<strong>{searchQuery}</strong>"</>}
                {selectedCategory !== 'all' && <> in <strong>{selectedCategory}</strong></>}
                {selectedBadge !== 'all' && <> (<strong>{selectedBadge.toUpperCase()}</strong>)</>}
                {showWishlistOnly && <> in <strong>Wishlist</strong></>}
              </span>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedBadge('all');
                  setShowWishlistOnly(false);
                }}
                style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <RotateCcw size={12} /> Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* PRODUCTS DISPLAY GRID */}
        {displayedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <Store size={52} style={{ color: '#94a3b8', margin: '0 auto 1rem auto' }} />
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>No products match your filters</h3>
            <p style={{ margin: '0.35rem 0 1.25rem 0', color: '#64748b', fontSize: '0.9rem' }}>
              Try searching for a different item or resetting your filters.
            </p>
            <button 
              className="btn btn-secondary" 
              onClick={() => { 
                setSearchQuery(''); 
                setSelectedCategory('all'); 
                setSelectedBadge('all');
                setShowWishlistOnly(false);
              }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className={`storefront-products-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
            {displayedProducts.map(product => {
              const qtyInCart = getProductCartQty(product.id);
              const price = Number(product.sellingPrice || 0);
              const mrp = Number(product.mrp || 0);
              const savings = mrp > price ? mrp - price : 0;
              const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
              const badge = product.catalogBadge;
              const isLowStock = Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 5;
              const productDetailUrl = getProductUrl(product.id);
              const isWish = wishlist.includes(product.id);

              return (
                <div key={product.id} className="bespoke-product-card">
                  {/* Floating Ribbon Badge */}
                  {badge && badge !== 'none' && (
                    <span className={`card-ribbon-badge ${badge}`}>
                      {badge === 'bestseller' && <><Star size={12} fill="#fff" /> Bestseller</>}
                      {badge === 'hot' && <><Flame size={12} fill="#fff" /> Hot Deal</>}
                      {badge === 'new' && <><Sparkles size={12} /> New Arrival</>}
                      {badge === 'featured' && <><Award size={12} /> Featured</>}
                    </span>
                  )}

                  {/* Wishlist Button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }}
                    style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.9)',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 15,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                    }}
                    title={isWish ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart size={16} fill={isWish ? '#ef4444' : 'none'} color={isWish ? '#ef4444' : '#64748b'} />
                  </button>

                  {/* Media Viewport */}
                  <div className="card-media-viewport" onClick={() => navigate(productDetailUrl)}>
                    {product.image ? (
                      <img src={product.image} alt={product.name} loading="lazy" />
                    ) : (
                      <Store size={54} color="#cbd5e1" />
                    )}
                    <button 
                      className="card-quick-lens-btn" 
                      onClick={(e) => { e.stopPropagation(); setQuickViewProduct(product); }}
                      title="Quick Specs & Wholesale Tiers"
                    >
                      <Eye size={18} />
                    </button>
                  </div>

                  {/* Details Body */}
                  <div className="card-details-body">
                    <span className="card-category-indicator">{product.productGroup || 'Commercial Stock'}</span>
                    <h3 className="card-product-title" onClick={() => navigate(productDetailUrl)}>
                      {product.name}
                    </h3>
                    <p className="card-product-desc">{product.description || 'Premium commercial verified inventory with guarantee.'}</p>

                    {isLowStock && (
                      <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Flame size={12} /> Only {product.stock} units left in stock!
                      </div>
                    )}

                    <div className="card-pricing-block">
                      <span className="selling-rate-hero">₹{price.toLocaleString('en-IN')}</span>
                      {discountPct > 0 && (
                        <>
                          <span className="mrp-strike-tag">₹{mrp.toLocaleString('en-IN')}</span>
                          <span className="saving-pill-highlight">Save ₹{savings.toLocaleString('en-IN')} ({discountPct}%)</span>
                        </>
                      )}
                    </div>
                    <div className="card-gst-status-note">
                      <CheckCircle2 size={13} color="#10b981" />
                      {product.taxRate ? `+${product.taxRate}% GST (ITC Tax Invoice Available)` : 'Tax Included in Price'}
                    </div>

                    {/* Action Bar */}
                    <div className="card-action-bar">
                      {/* REAL VIEW BUTTON */}
                      <button 
                        className="btn-card-view-pdp"
                        onClick={() => navigate(productDetailUrl)}
                        title="View Amazon-Style Product Detail Page"
                      >
                        <Eye size={14} /> View
                      </button>

                      {qtyInCart === 0 ? (
                        <button className="btn-card-add-primary" onClick={() => addToCart(product)}>
                          <ShoppingBag size={16} /> Add to Cart
                        </button>
                      ) : (
                        <div className="card-qty-stepper">
                          <button className="btn-stepper-btn" onClick={() => updateCartQty(product.id, -1)}>
                            <Minus size={14} />
                          </button>
                          <span className="stepper-val">{qtyInCart}</span>
                          <button className="btn-stepper-btn" onClick={() => updateCartQty(product.id, 1)}>
                            <Plus size={14} />
                          </button>
                        </div>
                      )}

                      <button 
                        className="btn-card-whatsapp-quick"
                        onClick={() => {
                          const text = `Hi, I am interested in *${product.name}* (Price: ₹${price}). Please share bulk discount rates and availability: ${window.location.origin}${productDetailUrl}`;
                          window.open(`https://wa.me/${(storeConfig?.whatsappNumber || '919876543210').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        title="Inquire directly on WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FOUR PILLARS TRUST GUARANTEE BANNER */}
      <section className="storefront-trust-banner">
        <div className="trust-pillars-grid">
          <div className="trust-pillar-item">
            <div className="trust-pillar-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4>100% Verified Quality</h4>
              <p>Direct manufacturer dispatch with genuine warranty coverage.</p>
            </div>
          </div>

          <div className="trust-pillar-item">
            <div className="trust-pillar-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <Truck size={24} />
            </div>
            <div>
              <h4>Fast Dispatch Across India</h4>
              <p>Free delivery on orders above ₹{storeConfig?.freeDeliveryAbove || '999'}.</p>
            </div>
          </div>

          <div className="trust-pillar-item">
            <div className="trust-pillar-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Award size={24} />
            </div>
            <div>
              <h4>Full GST ITC Claimable</h4>
              <p>Official GST invoices provided for business tax compliance.</p>
            </div>
          </div>

          <div className="trust-pillar-item">
            <div className="trust-pillar-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
              <MessageCircle size={24} />
            </div>
            <div>
              <h4>WhatsApp Concierge</h4>
              <p>Instant support, bulk wholesale quote negotiation & live updates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FLOATING WHATSAPP BUTTON */}
      <div className="floating-whatsapp-widget" onClick={() => window.open(`https://wa.me/${(storeConfig?.whatsappNumber || '919876543210').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${storeConfig?.storeName}, I am browsing your online catalog and have an inquiry.`)}`, '_blank')}>
        <div className="widget-pulse"></div>
        <MessageCircle size={26} color="#ffffff" />
        <span className="widget-label">Order on WhatsApp</span>
      </div>

      {/* ORDER TRACKER MODAL */}
      {showOrderTrackerModal && (
        <div className="quick-view-overlay" onClick={() => setShowOrderTrackerModal(false)}>
          <div className="quick-view-modal-card" style={{ maxWidth: '540px', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SearchCheck size={22} color="#0284c7" /> Live Order Status Lookup
              </h3>
              <button className="quick-view-close-btn" onClick={() => setShowOrderTrackerModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTrackOrder} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input 
                type="text" 
                placeholder="Enter Order ID (e.g. ORD-102)"
                value={trackOrderId}
                onChange={(e) => setTrackOrderId(e.target.value)}
                style={{ flex: 1, padding: '0.7rem 0.9rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ padding: '0.7rem 1.25rem' }}
              >
                Track
              </button>
            </form>

            {trackError && (
              <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {trackError}
              </div>
            )}

            {trackedOrderResult && (
              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>#{trackedOrderResult.orderId}</span>
                  <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                    {trackedOrderResult.status || 'Active Order'}
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>Customer: <strong>{trackedOrderResult.customerName}</strong></div>
                  <div>Phone: <strong>{trackedOrderResult.customerPhone}</strong></div>
                  <div>Date: <strong>{new Date(trackedOrderResult.createdAt).toLocaleDateString()}</strong></div>
                  <div>Total Value: <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>₹{Number(trackedOrderResult.totalAmount).toLocaleString('en-IN')}</strong></div>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                  <strong>Items in order:</strong>
                  {(trackedOrderResult.items || []).map((it, i) => (
                    <div key={i} style={{ color: '#334155', marginTop: '0.2rem' }}>
                      • {it.quantity}x {it.name} (₹{it.price})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SHOWROOM & CONTACT INFO MODAL */}
      {showStoreInfoModal && (
        <div className="quick-view-overlay" onClick={() => setShowStoreInfoModal(false)}>
          <div className="quick-view-modal-card" style={{ maxWidth: '520px', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={22} color="#0284c7" /> Showroom & Compliance Details
              </h3>
              <button className="quick-view-close-btn" onClick={() => setShowStoreInfoModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#0f172a' }}>{storeConfig?.storeName}</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>{storeConfig?.tagline}</p>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 700 }}>SHOWROOM ADDRESS</span>
                <strong style={{ color: '#0f172a' }}>{storeConfig?.address || 'Shop No. 14, Commercial Boulevard'}, {storeConfig?.city}</strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 700 }}>SHOWROOM HOURS</span>
                <strong style={{ color: '#0f172a' }}>{storeConfig?.operatingHours || 'Mon - Sat: 9:30 AM - 8:30 PM'}</strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 700 }}>GSTIN / TAX COMPLIANCE</span>
                <strong style={{ color: '#0284c7' }}>{storeConfig?.gstin || '27AABCU9603R1ZM'} (100% ITC Eligible)</strong>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  onClick={() => window.open(`https://wa.me/${(storeConfig?.whatsappNumber || '919876543210').replace(/[^0-9]/g, '')}`, '_blank')}
                >
                  <MessageCircle size={16} /> WhatsApp
                </button>
                {storeConfig?.phone && (
                  <button 
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    onClick={() => window.open(`tel:${storeConfig.phone}`, '_self')}
                  >
                    <PhoneCall size={16} /> Call Showroom
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK VIEW MODAL */}
      {quickViewProduct && (
        <div className="quick-view-overlay" onClick={() => setQuickViewProduct(null)}>
          <div className="quick-view-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="quick-view-close-btn" onClick={() => setQuickViewProduct(null)}>
              <X size={20} />
            </button>

            <div className="quick-view-media-col">
              <img src={quickViewProduct.image} alt={quickViewProduct.name} />
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#0284c7', borderColor: '#bae6fd' }}
                onClick={() => {
                  const id = quickViewProduct.id;
                  setQuickViewProduct(null);
                  navigate(getProductUrl(id));
                }}
              >
                <ExternalLink size={16} /> Open Full Product Page (Amazon Style)
              </button>
            </div>

            <div className="quick-view-info-col">
              <span className="card-category-indicator">{quickViewProduct.productGroup}</span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.25rem 0 0.75rem 0', color: '#0f172a' }}>
                {quickViewProduct.name}
              </h2>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
                  ₹{Number(quickViewProduct.sellingPrice || 0).toLocaleString('en-IN')}
                </span>
                {quickViewProduct.mrp && Number(quickViewProduct.mrp) > Number(quickViewProduct.sellingPrice) && (
                  <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '1rem' }}>
                    ₹{Number(quickViewProduct.mrp).toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {/* WHOLESALE TIERS BOX */}
              <div className="wholesale-tiers-box">
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Award size={15} /> Wholesale Tier Pricing Available
                </div>
                <div className="tiers-grid">
                  <div className="tier-item-pill">
                    <span>1 - 9 Units</span>
                    <strong>₹{Number(quickViewProduct.sellingPrice || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="tier-item-pill">
                    <span>10 - 49 Units (10% OFF)</span>
                    <strong>₹{Math.round(Number(quickViewProduct.sellingPrice || 0) * 0.9).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="tier-item-pill">
                    <span>50+ Units (20% OFF)</span>
                    <strong>₹{Math.round(Number(quickViewProduct.sellingPrice || 0) * 0.8).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {quickViewProduct.description || 'Verified commercial grade stock with direct manufacturer assurance.'}
              </p>

              <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '14px', marginBottom: '1.5rem', fontSize: '0.82rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div>Unit: <strong>{quickViewProduct.unit || 'PCS'}</strong></div>
                <div>HSN Code: <strong>{quickViewProduct.hsn || '8471'}</strong></div>
                <div>Tax Rate: <strong>{quickViewProduct.taxRate || 18}% GST</strong></div>
                <div>Stock Status: <strong>{Number(quickViewProduct.stock || 0) > 0 ? `${quickViewProduct.stock} In Stock` : 'Available on Order'}</strong></div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}
                  onClick={() => {
                    addToCart(quickViewProduct, 1);
                    setQuickViewProduct(null);
                    setIsCartOpen(true);
                  }}
                >
                  <ShoppingBag size={18} /> Add to Cart
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                  onClick={() => {
                    const text = `Hi, I am looking at *${quickViewProduct.name}* (Base Rate: ₹${quickViewProduct.sellingPrice}). Please let me know if wholesale quantities are ready for dispatch.`;
                    window.open(`https://wa.me/${(storeConfig?.whatsappNumber || '919876543210').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                >
                  <MessageCircle size={18} /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OUT CART DRAWER */}
      {isCartOpen && (
        <div className="cart-drawer-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <h3 className="cart-header-title">
                <ShoppingBag size={22} color="#0284c7" /> Your Shopping Cart ({totalCartItems})
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {cart.length > 0 && (
                  <button 
                    onClick={() => setCart([])} 
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    title="Remove all items from cart"
                  >
                    Clear Cart
                  </button>
                )}
                <button className="btn-close-drawer" onClick={() => setIsCartOpen(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* FREE DELIVERY PROGRESS */}
            <div className="free-delivery-progress-strip">
              {isFreeDelivery ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669' }}>
                  <CheckCircle2 size={16} /> 🎉 Congratulations! You unlocked <strong>FREE Express Delivery</strong>!
                </div>
              ) : (
                <div>
                  Add <strong>₹{amountNeededForFreeDelivery.toLocaleString('en-IN')}</strong> more to get <strong>FREE Delivery</strong>!
                </div>
              )}
              <div className="delivery-prog-bar-bg">
                <div className="delivery-prog-bar-fill" style={{ width: `${deliveryProgressPercent}%` }}></div>
              </div>
            </div>

            {/* ITEMS LIST */}
            <div className="cart-items-scroll-list">
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                  <ShoppingBag size={52} style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>Your cart is empty</p>
                  <p style={{ fontSize: '0.85rem', margin: '0.35rem 0 1.25rem 0' }}>Explore our catalog products and add items to place your order.</p>
                  <button className="btn btn-primary" onClick={() => setIsCartOpen(false)}>
                    Browse Products
                  </button>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="cart-item-row">
                    <div className="cart-item-thumb">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <Store size={24} color="#94a3b8" />
                      )}
                    </div>

                    <div className="cart-item-info">
                      <h4>{item.name}</h4>
                      <div className="cart-item-price-unit">
                        ₹{item.price.toLocaleString('en-IN')} / {item.unit}
                      </div>

                      <div className="cart-item-actions-row">
                        <div className="cart-mini-qty">
                          <button className="btn-qty-step" onClick={() => updateCartQty(item.id, -1)} style={{ width: '28px', height: '28px' }}>
                            <Minus size={12} />
                          </button>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, padding: '0 0.55rem' }}>{item.quantity}</span>
                          <button className="btn-qty-step" onClick={() => updateCartQty(item.id, 1)} style={{ width: '28px', height: '28px' }}>
                            <Plus size={12} />
                          </button>
                        </div>

                        <span style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>

                        <button className="btn-cart-remove" onClick={() => removeFromCart(item.id)} title="Remove item">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* REAL PROMO COUPON CODE SECTION */}
              {cart.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                    <Tag size={15} color="#0284c7" /> Have a Promo Coupon?
                  </div>

                  {!appliedCoupon ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        placeholder="e.g. WELCOME10"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textTransform: 'uppercase' }}
                      />
                      <button 
                        className="btn btn-primary"
                        onClick={handleApplyCoupon}
                        style={{ padding: '0.55rem 0.95rem', fontSize: '0.82rem' }}
                      >
                        Apply
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ecfdf5', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065f46' }}>
                        ✓ Coupon <strong>{appliedCoupon.code}</strong> Applied (-₹{couponDiscountAmount.toLocaleString('en-IN')})
                      </span>
                      <button 
                        onClick={handleRemoveCoupon}
                        style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {couponMessage.text && !appliedCoupon && (
                    <div style={{ fontSize: '0.78rem', marginTop: '0.35rem', color: couponMessage.isError ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                      {couponMessage.text}
                    </div>
                  )}
                </div>
              )}

              {/* PAYMENT MODE SELECTOR */}
              {cart.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CreditCard size={17} color="#0284c7" /> Select Payment Method
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button 
                      className={`payment-choice-btn ${selectedPaymentMode === 'whatsapp' ? 'active' : ''}`}
                      onClick={() => setSelectedPaymentMode('whatsapp')}
                    >
                      <MessageCircle size={16} /> Pay via WhatsApp
                    </button>
                    <button 
                      className={`payment-choice-btn ${selectedPaymentMode === 'upi' ? 'active' : ''}`}
                      onClick={() => setSelectedPaymentMode('upi')}
                    >
                      <QrCode size={16} /> Instant UPI QR
                    </button>
                    <button 
                      className={`payment-choice-btn ${selectedPaymentMode === 'cod' ? 'active' : ''}`}
                      onClick={() => setSelectedPaymentMode('cod')}
                    >
                      <Truck size={16} /> Pay on Delivery
                    </button>
                    <button 
                      className={`payment-choice-btn ${selectedPaymentMode === 'bank' ? 'active' : ''}`}
                      onClick={() => setSelectedPaymentMode('bank')}
                    >
                      <CreditCard size={16} /> Bank IMPS/NEFT
                    </button>
                  </div>

                  {/* REAL INSTANT UPI QR CODE */}
                  {selectedPaymentMode === 'upi' && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '0.5rem' }}>
                        Scan to Pay ₹{cartTotal.toLocaleString('en-IN')}
                      </span>
                      <div style={{ display: 'inline-block', padding: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                        <QRCodeSVG value={upiPayUrl} size={130} level="M" />
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.4rem' }}>
                        UPI ID: <strong>{storeConfig?.upiId || 'merchant@okaxis'}</strong>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                        Works with GPay, PhonePe, Paytm & BHIM
                      </span>
                    </div>
                  )}

                  {/* BANK TRANSFER DETAILS */}
                  {selectedPaymentMode === 'bank' && (
                    <div style={{ marginTop: '1rem', padding: '0.85rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
                      <div>Bank: <strong>{storeConfig?.bankName || 'HDFC Bank Ltd'}</strong></div>
                      <div>A/C Name: <strong>{storeConfig?.bankHolderName || storeConfig?.storeName}</strong></div>
                      <div>A/C Number: <strong>{storeConfig?.bankAccountNo || '50200088991122'}</strong></div>
                      <div>IFSC Code: <strong>{storeConfig?.bankIfsc || 'HDFC0000123'}</strong></div>
                    </div>
                  )}
                </div>
              )}

              {/* CUSTOMER DELIVERY DETAILS FORM */}
              {cart.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Truck size={17} color="#0284c7" /> Delivery & Customer Details
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input 
                      type="text" 
                      placeholder="Your Full Name *" 
                      value={customerDetails.name}
                      onChange={(e) => updateCustomerDetails('name', e.target.value)}
                      style={{ padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                    <input 
                      type="tel" 
                      placeholder="WhatsApp Phone Number *" 
                      value={customerDetails.phone}
                      onChange={(e) => updateCustomerDetails('phone', e.target.value)}
                      style={{ padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                    <input 
                      type="text" 
                      placeholder="Delivery Street Address / Landmark" 
                      value={customerDetails.address}
                      onChange={(e) => updateCustomerDetails('address', e.target.value)}
                      style={{ padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                    <input 
                      type="text" 
                      placeholder="City & Pincode" 
                      value={customerDetails.city}
                      onChange={(e) => updateCustomerDetails('city', e.target.value)}
                      style={{ padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                    <input 
                      type="text" 
                      placeholder="Special Instructions / GSTIN for ITC" 
                      value={customerDetails.note}
                      onChange={(e) => updateCustomerDetails('note', e.target.value)}
                      style={{ padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CHECKOUT TOTALS & DUAL BUTTONS */}
            {cart.length > 0 && (
              <div className="cart-drawer-footer">
                <div className="bill-summary-row">
                  <span>Subtotal ({totalCartItems} items)</span>
                  <span>₹{cartSubtotal.toLocaleString('en-IN')}</span>
                </div>

                {appliedCoupon && (
                  <div className="bill-summary-row" style={{ color: '#059669', fontWeight: 700 }}>
                    <span>Coupon Discount ({appliedCoupon.code})</span>
                    <span>-₹{couponDiscountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {bulkDiscountAmount > 0 && (
                  <div className="bill-summary-row" style={{ color: '#059669', fontWeight: 700 }}>
                    <span>Bulk Wholesale Discount</span>
                    <span>-₹{bulkDiscountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="bill-summary-row">
                  <span>Delivery Charge</span>
                  <span>{isFreeDelivery ? <strong style={{ color: '#059669' }}>FREE</strong> : `₹${deliveryCharge}`}</span>
                </div>

                <div className="bill-total-row">
                  <span>Total Payable:</span>
                  <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="checkout-dual-buttons">
                  <button className="btn-checkout-whatsapp" onClick={handleCheckoutWhatsApp}>
                    <MessageCircle size={19} /> Send Order on WhatsApp
                  </button>
                  <button className="btn-checkout-direct" onClick={handleDirectOrder}>
                    <Check size={19} /> Confirm Direct Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDER CONFIRMATION MODAL */}
      {orderConfirmed && (
        <div className="quick-view-overlay" onClick={() => setOrderConfirmed(null)}>
          <div style={{ background: '#ffffff', borderRadius: '26px', padding: '2.5rem', maxWidth: '520px', width: '100%', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
              <CheckCircle2 size={40} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Order Confirmed!
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: '0 0 1.5rem 0' }}>
              Your order <strong>#{orderConfirmed.orderId}</strong> has been transmitted to <strong>{storeConfig?.storeName}</strong>. Our team will verify dispatch details with you on WhatsApp.
            </p>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', textAlign: 'left', fontSize: '0.88rem', marginBottom: '1.75rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <span style={{ color: '#64748b' }}>Order Reference:</span>
                <strong style={{ color: '#0284c7' }}>#{orderConfirmed.orderId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <span style={{ color: '#64748b' }}>Total Bill:</span>
                <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>₹{Number(orderConfirmed.totalAmount).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <span style={{ color: '#64748b' }}>Payment Mode:</span>
                <strong style={{ textTransform: 'uppercase', color: '#16a34a' }}>{orderConfirmed.paymentMode || 'WhatsApp'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <span style={{ color: '#64748b' }}>Customer WhatsApp:</span>
                <strong>{orderConfirmed.customerPhone}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Dispatch Address:</span>
                <span>{orderConfirmed.customerAddress || 'Showroom Pickup'}</span>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.95rem', borderRadius: '14px', fontWeight: 800, fontSize: '0.95rem' }}
              onClick={() => setOrderConfirmed(null)}
            >
              Continue Browsing Store
            </button>
          </div>
        </div>
      )}

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="storefront-mobile-sticky-bar">
        <div className="mobile-sticky-cart-info">
          <span>₹{cartTotal.toLocaleString('en-IN')}</span>
          <small>{totalCartItems} {totalCartItems === 1 ? 'item' : 'items'} in cart</small>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn-mobile-cart-action" onClick={() => setIsCartOpen(true)}>
            <ShoppingBag size={15} /> Cart ({totalCartItems})
          </button>
          <button 
            className="btn-mobile-whatsapp-action" 
            onClick={() => {
              if (cart.length > 0) {
                setIsCartOpen(true);
              } else {
                window.open(`https://wa.me/${(storeConfig?.whatsappNumber || '919876543210').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${storeConfig?.storeName}, I am browsing your online catalog.`)}`, '_blank');
              }
            }}
          >
            <MessageCircle size={15} /> WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default DigitalCatalogPublic;
