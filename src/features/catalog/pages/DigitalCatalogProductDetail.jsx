import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Store, ShoppingBag, ArrowLeft, Star, ShieldCheck, Truck, 
  RotateCcw, CreditCard, MessageCircle, Share2, Check, Plus, 
  Minus, Heart, Flame, Sparkles, Award, MapPin, Tag, CheckCircle2,
  ChevronRight, Info, AlertTriangle, Eye, X, ZoomIn, ZoomOut, Maximize2,
  Trash2, QrCode, ThumbsUp, Send, CheckSquare, Clock, ArrowRight, UserCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getDB, getItems, addItem } from '@/utils/db';
import { QRCodeSVG } from 'qrcode.react';
import '@/features/catalog/styles/DigitalCatalogProductDetail.css';

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
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80'
    ]
  }
];

const INITIAL_REVIEWS = [
  {
    id: 'rev-1',
    author: 'Sunil Deshmukh',
    location: 'Mumbai, MH',
    rating: 5,
    date: '2 days ago',
    verified: true,
    title: 'Solid build & blazing fast scanning!',
    comment: 'Using this at our retail supermarket billing counter. Connects via Bluetooth and USB instantly with the GST software. Scans wrinkled barcodes without any lag. Received the GST tax invoice promptly.'
  },
  {
    id: 'rev-2',
    author: 'Rajiv Mehra',
    location: 'Bengaluru, KA',
    rating: 5,
    date: '1 week ago',
    verified: true,
    title: 'Great wholesale price & express dispatch',
    comment: 'Ordered 12 units for our distribution warehouse. The wholesale tier discount was automatically applied. Dispatched same day via BlueDart and reached within 48 hours in perfect packaging.'
  },
  {
    id: 'rev-3',
    author: 'Anita Sharma',
    location: 'Delhi NCR',
    rating: 4,
    date: '2 weeks ago',
    verified: true,
    title: 'Excellent product, highly recommended',
    comment: 'High quality finish, feels very durable. WhatsApp customer support was extremely responsive when I had a query about thermal paper size compatibility.'
  }
];

const DigitalCatalogProductDetail = () => {
  const { productId, storeId, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Determine effective store owner ID
  const effectiveStoreId = storeId || id || user?.id || 'default';

  // Product & Store State
  const [product, setProduct] = useState(null);
  const [storeConfig, setStoreConfig] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [activeImage, setActiveImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('400001');
  const [pincodeVerdict, setPincodeVerdict] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [cartSuccessAlert, setCartSuccessAlert] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Amazon Hover Zoom
  const [isZooming, setIsZooming] = useState(false);
  const [zoomCoords, setZoomCoords] = useState({ x: 0, y: 0, percentX: 0, percentY: 0, width: 450, height: 450 });
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  // Customer Reviews
  const [reviews, setReviews] = useState(() => {
    try {
      const saved = localStorage.getItem(`gogstbill_reviews_${productId}`);
      return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
    } catch (e) {
      return INITIAL_REVIEWS;
    }
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ author: '', rating: 5, location: '', title: '', comment: '' });

  // Cart Drawer State (Slide-out)
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(null);

  // Cart persistent state
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(`gogstbill_cart_${effectiveStoreId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Coupon & Payment Mode
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState({ text: '', isError: false });
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('whatsapp');

  // Customer Details Form
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    note: ''
  });

  // Sync Cart
  useEffect(() => {
    try {
      localStorage.setItem(`gogstbill_cart_${effectiveStoreId}`, JSON.stringify(cart));
    } catch (e) {}
  }, [cart, effectiveStoreId]);

  // Load Data
  useEffect(() => {
    const loadProductData = async () => {
      const company = getDB()?.company || {};
      
      // Load store configuration
      let config = null;
      const savedConfig = localStorage.getItem(`gogstbill_catalog_config_${effectiveStoreId}`);
      if (savedConfig) {
        try { config = JSON.parse(savedConfig); } catch (e) {}
      }

      // If still null, try finding any saved config in localStorage
      if (!config) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('gogstbill_catalog_config_')) {
            try {
              const val = JSON.parse(localStorage.getItem(key));
              if (val && val.storeName) {
                config = val;
                break;
              }
            } catch (e) {}
          }
        }
      }

      if (!config) {
        config = {
          template: 'flagship',
          storeName: company.name || 'Apex Commercial Emporium',
          tagline: 'Direct Manufacturer & Wholesale Distributor of Premium Commercial Goods',
          description: 'Official digital catalog with live verified inventory, 100% genuine tax invoices, and express dispatch across India.',
          whatsappNumber: company.phone || '9876543210',
          freeDeliveryAbove: '999',
          flatShippingFee: '50',
          city: company.state || 'Mumbai, Maharashtra',
          deliverablePincodes: '',
          promoCoupon: 'WELCOME10',
          couponType: 'percentage',
          couponValue: 10,
          couponMinOrder: 499,
          bulkDiscountActive: true,
          bulkMinOrder: 5000,
          bulkDiscountPct: 5,
          upiId: 'merchant@okaxis',
          isOnline: true
        };
      }
      setStoreConfig(config);

      // Load products
      let allProducts = [];
      try {
        allProducts = await getItems('products', effectiveStoreId);
      } catch (e) {
        allProducts = getDB()?.products || [];
      }

      if (!allProducts || allProducts.length === 0) {
        try {
          if (user?.id) {
            allProducts = await getItems('products', user.id);
          }
        } catch (e) {}
      }

      if (!allProducts || allProducts.length === 0) {
        allProducts = getDB()?.products || [];
      }

      if (!allProducts || allProducts.length === 0) {
        allProducts = DEFAULT_REAL_PRODUCTS;
      }

      // Find current product
      let found = (allProducts || []).find(p => 
        String(p.id) === String(productId) || 
        String(p._dbId) === String(productId) || 
        String(p.code) === String(productId) ||
        String(p.barcodeStr) === String(productId)
      );

      // Fallback to first default product
      if (!found) {
        found = DEFAULT_REAL_PRODUCTS.find(p => p.id === productId) || DEFAULT_REAL_PRODUCTS[0];
      }

      setProduct(found);
      setActiveImage(found.image || (found.gallery && found.gallery[0]));

      // Set related products (exclude current)
      const others = allProducts.filter(p => String(p.id) !== String(found.id));
      const sameGroup = others.filter(p => p.productGroup === found.productGroup);
      const candidates = sameGroup.length >= 2 ? sameGroup : others;
      setRelatedProducts(candidates.slice(0, 4));

      // Check wishlist
      try {
        const savedWishlist = JSON.parse(localStorage.getItem('gogstbill_wishlist') || '[]');
        setIsWishlisted(savedWishlist.includes(found.id));
      } catch (e) {}
    };

    loadProductData();
  }, [productId, effectiveStoreId, user?.id]);

  // Wishlist toggle
  const handleToggleWishlist = () => {
    try {
      const savedWishlist = JSON.parse(localStorage.getItem('gogstbill_wishlist') || '[]');
      let updated = [];
      if (savedWishlist.includes(product.id)) {
        updated = savedWishlist.filter(id => id !== product.id);
        setIsWishlisted(false);
      } else {
        updated = [...savedWishlist, product.id];
        setIsWishlisted(true);
      }
      localStorage.setItem('gogstbill_wishlist', JSON.stringify(updated));
    } catch (e) {}
  };

  // Amazon Hover Zoom
  const handleImageMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentX = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const percentY = Math.max(0, Math.min(100, (y / rect.height) * 100));
    
    setZoomCoords({ x, y, percentX, percentY, width: rect.width, height: rect.height });
    setIsZooming(true);
  };

  const handleImageMouseLeave = () => {
    setIsZooming(false);
  };

  // Real Indian Pincode Delivery Check
  const handleCheckPincode = () => {
    if (!pincode || pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      setPincodeVerdict({ valid: false, message: 'Please enter a valid 6-digit Indian PIN code.' });
      return;
    }

    const restrictedList = storeConfig?.deliverablePincodes?.trim();
    if (restrictedList) {
      const allowedCodes = restrictedList.split(',').map(c => c.trim());
      if (!allowedCodes.includes(pincode)) {
        setPincodeVerdict({ 
          valid: false, 
          message: `Delivery is currently not available to pincode ${pincode}. Contact via WhatsApp for special truck dispatch.` 
        });
        return;
      }
    }

    const d = new Date();
    d.setDate(d.getDate() + 2);
    const dateStr = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    const isFree = Number(product.sellingPrice || 0) >= Number(storeConfig?.freeDeliveryAbove || 999);

    setPincodeVerdict({
      valid: true,
      date: dateStr,
      isFree,
      message: `Delivery by ${dateStr} • ${isFree ? 'FREE Delivery' : `Standard Delivery ₹${storeConfig?.flatShippingFee || 50}`} (COD & UPI Available)`
    });
  };

  // Add Review
  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newReview.author.trim() || !newReview.comment.trim()) {
      alert('Please enter your name and review comment.');
      return;
    }

    const reviewObj = {
      id: `rev-${Date.now()}`,
      author: newReview.author.trim(),
      location: newReview.location.trim() || 'Verified Buyer',
      rating: Number(newReview.rating) || 5,
      date: 'Just now',
      verified: true,
      title: newReview.title.trim() || 'Great experience',
      comment: newReview.comment.trim()
    };

    const updated = [reviewObj, ...reviews];
    setReviews(updated);
    try {
      localStorage.setItem(`gogstbill_reviews_${productId}`, JSON.stringify(updated));
    } catch (err) {}

    setShowReviewModal(false);
    setNewReview({ author: '', rating: 5, location: '', title: '', comment: '' });
  };

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <Store size={48} color="#0284c7" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ margin: 0 }}>Loading Product Specifications...</h3>
        </div>
      </div>
    );
  }

  // Pricing & Wholesale Calculation
  const price = Number(product.sellingPrice || 0);
  const mrp = Number(product.mrp || price);
  const savings = mrp > price ? mrp - price : 0;
  const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  let effectivePrice = price;
  if (quantity >= 50) {
    effectivePrice = Math.round(price * 0.8);
  } else if (quantity >= 10) {
    effectivePrice = Math.round(price * 0.9);
  }

  // Cart Functions
  const totalCartCount = cart.reduce((sum, it) => sum + (it.quantity || 1), 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const freeDeliveryThreshold = Number(storeConfig?.freeDeliveryAbove || 999);
  const isFreeDelivery = cartSubtotal >= freeDeliveryThreshold;
  const deliveryCharge = isFreeDelivery || cart.length === 0 ? 0 : Number(storeConfig?.flatShippingFee || 50);

  let couponDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      couponDiscountAmount = Math.round((cartSubtotal * appliedCoupon.value) / 100);
    } else {
      couponDiscountAmount = Math.min(cartSubtotal, appliedCoupon.value);
    }
  }

  let bulkDiscountAmount = 0;
  if (storeConfig?.bulkDiscountActive && cartSubtotal >= Number(storeConfig.bulkMinOrder || 5000)) {
    bulkDiscountAmount = Math.round((cartSubtotal * Number(storeConfig.bulkDiscountPct || 5)) / 100);
  }

  const totalDiscount = couponDiscountAmount + bulkDiscountAmount;
  const cartTotal = Math.max(0, cartSubtotal + deliveryCharge - totalDiscount);
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - cartSubtotal);
  const deliveryProgressPercent = Math.min(100, (cartSubtotal / freeDeliveryThreshold) * 100);

  const addToCart = (customProduct = product, customQty = quantity) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === customProduct.id);
      if (existing) {
        return prev.map(item => item.id === customProduct.id ? { ...item, quantity: item.quantity + customQty } : item);
      }
      return [...prev, {
        id: customProduct.id,
        name: customProduct.name,
        price: effectivePrice,
        mrp: Number(customProduct.mrp || customProduct.sellingPrice || 0),
        image: customProduct.image,
        unit: customProduct.unit || 'PCS',
        taxRate: Number(customProduct.taxRate || 18),
        hsn: customProduct.hsn || '',
        quantity: customQty
      }];
    });

    setCartSuccessAlert(true);
    setTimeout(() => setCartSuccessAlert(false), 3000);
  };

  const updateCartQty = (prodId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === prodId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (prodId) => {
    setCart(prev => prev.filter(item => item.id !== prodId));
  };

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

  // UPI QR String
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(storeConfig?.upiId || 'merchant@okaxis')}&pn=${encodeURIComponent(storeConfig?.storeName || 'Store')}&am=${cartTotal}&cu=INR`;

  // WhatsApp Single-Product Direct Purchase
  const handleBuyOnWhatsApp = async () => {
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const text = `🛒 *DIRECT PURCHASE INQUIRY (#${orderId})*
----------------------------------
🏢 *Store:* ${storeConfig?.storeName || 'Commercial Store'}
📦 *Product:* ${product.name}
🔢 *Quantity:* ${quantity} ${product.unit || 'PCS'}
💰 *Price Each:* ₹${effectivePrice.toLocaleString('en-IN')}
💵 *Total Amount:* ₹${(effectivePrice * quantity).toLocaleString('en-IN')}
📍 *Pin Code:* ${pincode}
----------------------------------
Please confirm dispatch timeline and payment details.`;

    // Save lead into database so it appears in Mini CRM
    try {
      await addItem('catalogOrders', {
        orderId,
        customerName: 'WhatsApp Buyer',
        customerPhone: storeConfig?.whatsappNumber || 'N/A',
        customerAddress: `PIN: ${pincode}`,
        items: [{
          id: product.id,
          name: product.name,
          price: effectivePrice,
          quantity,
          unit: product.unit || 'PCS'
        }],
        subtotal: effectivePrice * quantity,
        totalAmount: effectivePrice * quantity,
        paymentMode: 'WhatsApp Direct',
        status: 'WhatsApp Inquiry',
        createdAt: new Date().toISOString()
      }, effectiveStoreId);
    } catch (e) {
      console.warn('Could not record WhatsApp PDP lead:', e);
    }

    const number = (storeConfig?.whatsappNumber || '919876543210').replace(/[^0-9]/g, '');
    window.open(`https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(text)}`, '_blank');
  };

  // Checkout Option: Cart on WhatsApp
  const handleCheckoutWhatsApp = async () => {
    if (cart.length === 0) return;

    if (!customerDetails.name.trim() || !customerDetails.phone.trim()) {
      alert("Please enter your Full Name and WhatsApp phone number.");
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
📦 *Items Ordered (${totalCartCount} total):*
${itemsSummary}
---------------------------------------
💰 *Subtotal:* ₹${cartSubtotal.toLocaleString('en-IN')}
🚚 *Delivery:* ${isFreeDelivery ? 'FREE' : `₹${deliveryCharge}`}
${appliedCoupon ? `🏷️ *Coupon (${appliedCoupon.code}):* -₹${couponDiscountAmount.toLocaleString('en-IN')}\n` : ''}${bulkDiscountAmount > 0 ? `⚡ *Bulk Wholesale Discount:* -₹${bulkDiscountAmount.toLocaleString('en-IN')}\n` : ''}💵 *TOTAL AMOUNT:* ₹${cartTotal.toLocaleString('en-IN')}
---------------------------------------
_Sent via Official BaniyaBook Digital Catalog Platform_`;

    await saveOrderToDB('WhatsApp Inquiry', orderId);

    const recipientNumber = (storeConfig?.whatsappNumber || '919876543210').replace(/[^0-9]/g, '');
    window.open(`https://api.whatsapp.com/send?phone=${recipientNumber}&text=${encodeURIComponent(message)}`, '_blank');
  };

  // Checkout Option: Direct Order
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
      await addItem('catalogOrders', newOrder, effectiveStoreId);
    } catch (e) {
      console.error('Failed to save order to DB:', e);
    }

    setOrderConfirmed(newOrder);
    setCart([]);
    setIsCartOpen(false);
  };

  // Share Handlers
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `Check out *${product.name}* at ₹${effectivePrice.toLocaleString('en-IN')} in our store: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const galleryList = product.gallery && product.gallery.length > 0 
    ? product.gallery 
    : [product.image, 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80'].filter(Boolean);

  const activeTemplate = storeConfig?.template && storeConfig.template !== 'amazon' ? storeConfig.template : 'flagship';
  const catalogUrl = effectiveStoreId && effectiveStoreId !== 'default' ? `/catalog/${effectiveStoreId}` : '/catalog';

  return (
    <div className={`pdp-wrapper template-${activeTemplate}`}>
      {/* TOP ANNOUNCEMENT STRIP */}
      <div className="pdp-top-strip">
        <Sparkles size={14} />
        <span>DIRECT FACTORY DISPATCH • 100% ORIGINAL GENUINE STOCK • GST ITC TAX INVOICE INCLUDED</span>
      </div>

      {/* NAVBAR */}
      <header className="pdp-navbar">
        <div className="pdp-navbar-inner">
          <button className="pdp-back-btn" onClick={() => navigate(catalogUrl)}>
            <ArrowLeft size={16} /> Back to Catalog
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button className="pdp-back-btn" onClick={handleShareWhatsApp} title="Share on WhatsApp">
              <MessageCircle size={16} color="#25d366" />
              <span className="hide-on-mobile">WhatsApp</span>
            </button>

            <button className="pdp-back-btn" onClick={handleShare} title="Copy Link">
              {copiedLink ? <Check size={16} color="#10b981" /> : <Share2 size={16} />}
              <span>{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>

            <button 
              className="pdp-back-btn"
              style={{ background: '#0284c7', color: '#ffffff', borderColor: '#0284c7' }}
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBag size={16} /> Cart ({totalCartCount})
            </button>
          </div>
        </div>
      </header>

      {/* CART ADDED NOTIFICATION TOAST */}
      {cartSuccessAlert && (
        <div className="pdp-toast-alert">
          <CheckCircle2 size={18} /> Added {quantity}x "{product.name}" to cart! 
          <button onClick={() => setIsCartOpen(true)} style={{ marginLeft: '1rem', background: '#ffffff', color: '#065f46', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}>
            View Cart
          </button>
        </div>
      )}

      {/* BREADCRUMBS */}
      <div className="pdp-breadcrumbs-bar">
        <span onClick={() => navigate(catalogUrl)}>Store Home</span>
        <ChevronRight size={14} />
        <span onClick={() => navigate(catalogUrl)}>{product.productGroup || 'Inventory'}</span>
        <ChevronRight size={14} />
        <span className="active-crumb">{product.name}</span>
      </div>

      {/* MAIN 3-COLUMN PDP CONTAINER */}
      <div className="pdp-main-container">
        <div className="pdp-layout-grid">
          {/* COLUMN 1: IMAGE GALLERY WITH AMAZON-STYLE ZOOM */}
          <div className="pdp-gallery-column">
            <div 
              className="pdp-main-image-viewport"
              onMouseMove={handleImageMouseMove}
              onMouseLeave={handleImageMouseLeave}
              onClick={() => setShowLightbox(true)}
              title="Click for full-screen inspection"
            >
              {/* Product Badge */}
              {product.catalogBadge && product.catalogBadge !== 'none' && (
                <span className={`pdp-badge-tag ${product.catalogBadge}`}>
                  {product.catalogBadge === 'bestseller' && <><Star size={12} fill="#fff" /> #1 Bestseller</>}
                  {product.catalogBadge === 'hot' && <><Flame size={12} fill="#fff" /> Hot Deal</>}
                  {product.catalogBadge === 'new' && <><Sparkles size={12} /> New Release</>}
                  {product.catalogBadge === 'featured' && <><Award size={12} /> Featured</>}
                </span>
              )}

              {/* Wishlist Heart */}
              <button 
                className="pdp-wishlist-btn"
                onClick={(e) => { e.stopPropagation(); handleToggleWishlist(); }}
                title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 20,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.08)'
                }}
              >
                <Heart size={18} fill={isWishlisted ? '#ef4444' : 'none'} color={isWishlisted ? '#ef4444' : '#64748b'} />
              </button>

              {/* Main Image */}
              {activeImage ? (
                <img 
                  src={activeImage} 
                  alt={product.name} 
                  className="pdp-main-img" 
                />
              ) : (
                <Store size={80} color="#cbd5e1" />
              )}

              {/* AMAZON OPTICAL ZOOM LENS */}
              {isZooming && (
                <div 
                  className="amazon-zoom-lens"
                  style={{
                    left: `${Math.max(0, Math.min(zoomCoords.width - 130, zoomCoords.x - 65))}px`,
                    top: `${Math.max(0, Math.min(zoomCoords.height - 130, zoomCoords.y - 65))}px`,
                    width: '130px',
                    height: '130px'
                  }}
                />
              )}

              {/* Click to expand hint */}
              <div className="zoom-hover-hint">
                <Maximize2 size={13} /> Click to expand
              </div>
            </div>

            {/* THUMBNAILS CAROUSEL */}
            <div className="pdp-thumbnails-strip">
              {galleryList.map((imgUrl, i) => (
                <div 
                  key={i} 
                  className={`pdp-thumb-slot ${activeImage === imgUrl ? 'active' : ''}`}
                  onMouseEnter={() => setActiveImage(imgUrl)}
                  onClick={() => setActiveImage(imgUrl)}
                >
                  <img src={imgUrl} alt={`Thumbnail ${i}`} />
                </div>
              ))}
            </div>

            {/* AMAZON ZOOM RESULT WINDOW */}
            {isZooming && (
              <div className="amazon-zoom-result-window">
                <div 
                  className="amazon-zoom-result-image"
                  style={{
                    backgroundImage: `url(${activeImage})`,
                    backgroundPosition: `${zoomCoords.percentX}% ${zoomCoords.percentY}%`,
                    backgroundSize: '280%'
                  }}
                />
                <div className="amazon-zoom-tip">
                  <Sparkles size={12} /> Optical 2.8x high-definition zoom
                </div>
              </div>
            )}
          </div>

          {/* COLUMN 2: DETAILS & SPECIFICATIONS */}
          <div className="pdp-details-column">
            <div className="pdp-brand-seller-bar">
              <span className="pdp-brand-name">{product.brand || storeConfig?.storeName || 'Certified Brand'}</span>
              <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <ShieldCheck size={14} color="#0284c7" /> GST Verified Merchant
              </span>
            </div>

            <h1 className="pdp-product-title">{product.name}</h1>

            {/* RATINGS */}
            <div className="pdp-ratings-row">
              <span className="pdp-rating-badge">
                4.8 <Star size={11} fill="#fff" />
              </span>
              <span className="pdp-reviews-count">{reviews.length} Ratings & 42 Verified Inquiries</span>
            </div>

            {/* TEMPLATE-AWARE SPECIAL BADGE */}
            {(activeTemplate === 'flagship' || activeTemplate === 'amazon') && (
              <div className="pdp-prime-strip">
                <span className="prime-pill">⭐ Flagship Verified</span>
                <span>FREE Express Delivery on orders over ₹{storeConfig?.freeDeliveryAbove || '999'}</span>
              </div>
            )}

            {(activeTemplate === 'wholesale' || activeTemplate === 'flipkart') && (
              <div className="pdp-flipkart-strip">
                <span className="assured-pill">⚡ Wholesale B2B</span>
                <span>Bulk Discount Tiers Active & 100% GST Tax Invoice</span>
              </div>
            )}

            {(activeTemplate === 'boutique' || activeTemplate === 'luxury') && (
              <div className="pdp-prime-strip" style={{ background: '#fdfbf7', borderColor: '#e2d4b7' }}>
                <span className="prime-pill" style={{ background: '#d4af37', color: '#09090b' }}>✨ Exclusive Edition</span>
                <span style={{ color: '#856404' }}>Complimentary White Glove Dispatch & Insured Delivery</span>
              </div>
            )}

            {(activeTemplate === 'neo-tech' || activeTemplate === 'tech') && (
              <div className="pdp-prime-strip" style={{ background: '#f0fdff', borderColor: '#a5f3fc' }}>
                <span className="prime-pill" style={{ background: '#06b6d4', color: '#0b0f19' }}>💻 Certified Tech</span>
                <span style={{ color: '#0e7490' }}>1 Year Replacement Warranty • High Precision Hardware</span>
              </div>
            )}

            {(activeTemplate === 'express-mart' || activeTemplate === 'grocery') && (
              <div className="pdp-grocery-strip">
                <span className="grocery-pill">⚡ QuickMart Express</span>
                <span>Instant dispatch from local fulfillment hub</span>
              </div>
            )}

            <span className="pdp-deal-pill">Limited Time Wholesale Rate</span>

            {/* PRICING BLOCK */}
            <div className="pdp-pricing-section">
              <div className="pdp-price-hero-line">
                <span className="pdp-selling-price">₹{effectivePrice.toLocaleString('en-IN')}</span>
                {discountPct > 0 && (
                  <>
                    <span className="pdp-mrp-strike">₹{mrp.toLocaleString('en-IN')}</span>
                    <span className="pdp-discount-pill">Save ₹{(savings).toLocaleString('en-IN')} ({discountPct}% OFF)</span>
                  </>
                )}
              </div>
              <div className="pdp-tax-note">
                <CheckCircle2 size={13} color="#10b981" />
                <span>Inclusive of GST ({product.taxRate || '18'}%) • HSN Code: <strong>{product.hsn || '8471'}</strong></span>
              </div>
            </div>

            {/* BANK & CASHBACK OFFERS */}
            <div className="pdp-offers-box">
              <h4 className="pdp-offers-title">
                <Tag size={16} /> Exclusive Buyer Offers
              </h4>
              <div className="pdp-offer-item">
                <span>🏷️</span>
                <span><strong>Wholesale Tier:</strong> Buy 10+ units get 10% discount; 50+ units get 20% discount.</span>
              </div>
              <div className="pdp-offer-item">
                <span>🏷️</span>
                <span><strong>Free Express Shipping:</strong> Orders above ₹{storeConfig?.freeDeliveryAbove || '999'} qualify for zero delivery fee.</span>
              </div>
              <div className="pdp-offer-item">
                <span>🏷️</span>
                <span><strong>GST ITC Benefit:</strong> Claim up to 18% Input Tax Credit on your business GSTIN invoice.</span>
              </div>
            </div>

            {/* WHOLESALE TIER PRICING CALCULATOR */}
            <div className="pdp-wholesale-card">
              <div className="pdp-wholesale-header">
                <span>⚡ Wholesale Tier Pricing (B2B + B2C)</span>
                <span style={{ fontSize: '0.78rem', background: '#dbeafe', color: '#1d4ed8', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
                  Direct Factory Tier
                </span>
              </div>

              <div className="pdp-tier-columns">
                <div 
                  className={`pdp-tier-tile ${quantity < 10 ? 'selected-tier' : ''}`}
                  onClick={() => setQuantity(1)}
                  style={{ cursor: 'pointer' }}
                >
                  <span>1 - 9 Units</span>
                  <strong>₹{price.toLocaleString('en-IN')}</strong>
                  <small>Base Factory Rate</small>
                </div>
                <div 
                  className={`pdp-tier-tile ${quantity >= 10 && quantity < 50 ? 'selected-tier' : ''}`}
                  onClick={() => setQuantity(10)}
                  style={{ cursor: 'pointer' }}
                >
                  <span>10 - 49 Units</span>
                  <strong>₹{Math.round(price * 0.9).toLocaleString('en-IN')}</strong>
                  <small>10% Instant Off</small>
                </div>
                <div 
                  className={`pdp-tier-tile ${quantity >= 50 ? 'selected-tier' : ''}`}
                  onClick={() => setQuantity(50)}
                  style={{ cursor: 'pointer' }}
                >
                  <span>50+ Units</span>
                  <strong>₹{Math.round(price * 0.8).toLocaleString('en-IN')}</strong>
                  <small>20% Bulk Off</small>
                </div>
              </div>
            </div>

            {/* REAL PINCODE CHECKER */}
            <div className="pdp-pincode-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={15} color="#0284c7" /> Check Delivery Date & Availability:
                </span>
              </div>
              <div className="pdp-pincode-input-group">
                <input 
                  type="text" 
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Enter 6-digit Pincode"
                  maxLength={6}
                />
                <button className="btn-check-pincode" onClick={handleCheckPincode}>
                  Check Pincode
                </button>
              </div>

              {pincodeVerdict && (
                <div className={`pdp-delivery-verdict ${pincodeVerdict.valid ? 'success' : 'error'}`}>
                  {pincodeVerdict.valid ? <Truck size={15} /> : <AlertTriangle size={15} />}
                  <span>{pincodeVerdict.message}</span>
                </div>
              )}

              <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
                <Clock size={14} /> ⚡ Order in next 3 hrs 24 mins for same-day dispatch!
              </div>
            </div>

            {/* PRODUCT OVERVIEW DESCRIPTION */}
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
                Product Overview & Description
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                {product.description}
              </p>
            </div>
          </div>

          {/* COLUMN 3: DESKTOP BUY BOX */}
          <div className="pdp-buy-box-desktop">
            <div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Payable Amount:</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>
                ₹{(effectivePrice * quantity).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
                {effectivePrice < price ? `Wholesale Tier Discount Applied!` : 'Standard Factory Rate'}
              </div>
            </div>

            <div className={`pdp-stock-status-tag ${Number(product.stock || 0) <= 5 ? 'low' : ''}`}>
              <CheckCircle2 size={16} />
              {Number(product.stock || 0) > 0 ? `In Stock (Ships in 24 Hours)` : 'Available on Backorder'}
            </div>

            {/* QUANTITY PICKER */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                Order Quantity ({product.unit || 'PCS'}):
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.25rem', width: 'fit-content' }}>
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{ width: '32px', height: '32px', border: 'none', background: '#f1f5f9', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Minus size={14} />
                </button>
                <input 
                  type="number" 
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '50px', textAlign: 'center', border: 'none', fontWeight: 800, fontSize: '0.95rem', outline: 'none' }}
                />
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  style={{ width: '32px', height: '32px', border: 'none', background: '#f1f5f9', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* BUY ACTIONS */}
            <div className="pdp-buybox-actions">
              <button className="btn-buybox-add-cart" onClick={() => addToCart(product, quantity)}>
                <ShoppingBag size={18} /> Add to Cart
              </button>
              <button className="btn-buybox-whatsapp-buy" onClick={handleBuyOnWhatsApp}>
                <MessageCircle size={18} /> Buy Now via WhatsApp
              </button>
            </div>

            {/* SELLER TRUST */}
            <div className="pdp-seller-trust-box">
              <div>Sold By: <strong>{storeConfig?.storeName}</strong></div>
              <div>Dispatch Hub: <strong>{storeConfig?.city}</strong></div>
              <div>Replacement: <strong>7 Days Easy Replacement</strong></div>
              <div>GST Invoice: <strong>100% Genuine Tax Invoice</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* TECHNICAL SPECIFICATIONS TABLE */}
      <section className="pdp-specs-section">
        <div className="pdp-specs-card">
          <h3>Technical Details & Product Specifications</h3>
          <table className="pdp-specs-table">
            <tbody>
              <tr>
                <td>Product Model / SKU Code</td>
                <td>{product.barcodeStr || product.code || 'PRD-9002'}</td>
              </tr>
              <tr>
                <td>HSN / SAC Code</td>
                <td>{product.hsn || '8471.90.00'}</td>
              </tr>
              <tr>
                <td>Applicable GST Rate</td>
                <td>{product.taxRate || '18'}% Goods and Services Tax</td>
              </tr>
              <tr>
                <td>Unit of Measure</td>
                <td>{product.unit || 'Pieces (PCS)'}</td>
              </tr>
              <tr>
                <td>Manufacturer / Brand</td>
                <td>{product.brand || storeConfig?.storeName}</td>
              </tr>
              <tr>
                <td>Country of Origin</td>
                <td>{product.countryOfOrigin || 'India'}</td>
              </tr>
              <tr>
                <td>Warranty Description</td>
                <td>{product.warranty || '1 Year Direct Manufacturer Warranty'}</td>
              </tr>
              <tr>
                <td>Package Inclusions</td>
                <td>1x {product.name}, User Manual, Quick Setup Guide, Warranty Card</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* CUSTOMER REVIEWS & RATINGS SECTION */}
      <section className="pdp-reviews-section" style={{ maxWidth: '1400px', margin: '2rem auto 0 auto', padding: '0 1.5rem' }}>
        <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '2.25rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                Customer Reviews & Verified Buyer Ratings
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Feedback from commercial businesses, shopkeepers & wholesale buyers.
              </p>
            </div>
            <button 
              onClick={() => setShowReviewModal(true)}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Star size={16} fill="#fff" /> Write a Customer Review
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 320px) 1fr', gap: '2.5rem' }}>
            {/* Rating Summary Bar Card */}
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '3rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>4.8</span>
                <div>
                  <div style={{ display: 'flex', color: '#f59e0b', gap: '2px' }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#f59e0b" />)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Based on {reviews.length} verified ratings
                  </div>
                </div>
              </div>

              {/* Progress bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>5 ★</span>
                  <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '84%', height: '100%', background: '#f59e0b' }}></div>
                  </div>
                  <span style={{ width: '30px', textAlign: 'right', color: '#64748b' }}>84%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>4 ★</span>
                  <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '12%', height: '100%', background: '#f59e0b' }}></div>
                  </div>
                  <span style={{ width: '30px', textAlign: 'right', color: '#64748b' }}>12%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>3 ★</span>
                  <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '3%', height: '100%', background: '#f59e0b' }}></div>
                  </div>
                  <span style={{ width: '30px', textAlign: 'right', color: '#64748b' }}>3%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>2 ★</span>
                  <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '1%', height: '100%', background: '#cbd5e1' }}></div>
                  </div>
                  <span style={{ width: '30px', textAlign: 'right', color: '#64748b' }}>1%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>1 ★</span>
                  <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '0%', height: '100%', background: '#cbd5e1' }}></div>
                  </div>
                  <span style={{ width: '30px', textAlign: 'right', color: '#64748b' }}>0%</span>
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {reviews.map((rev) => (
                <div key={rev.id} style={{ paddingBottom: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                        {rev.author[0]}
                      </div>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{rev.author}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>• {rev.location}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{rev.date}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', color: '#f59e0b', gap: '1px' }}>
                      {[...Array(rev.rating)].map((_, i) => <Star key={i} size={13} fill="#f59e0b" />)}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{rev.title}</span>
                    {rev.verified && (
                      <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#065f46', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Check size={11} /> Verified Buyer
                      </span>
                    )}
                  </div>

                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                    {rev.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FREQUENTLY BOUGHT TOGETHER / RELATED PRODUCTS FROM THIS STORE */}
      {relatedProducts.length > 0 && (
        <section className="pdp-cross-sell-section">
          <div className="pdp-cross-sell-card">
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              More Recommended Products from {storeConfig?.storeName}
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Frequently purchased together with this item at direct wholesale rates.
            </p>

            <div className="pdp-cross-sell-grid">
              {relatedProducts.map(rel => (
                <div 
                  key={rel.id} 
                  className="cross-sell-item-card"
                  onClick={() => navigate(`/catalog/${effectiveStoreId}/product/${rel.id}`)}
                >
                  <img src={rel.image} alt={rel.name} />
                  <span style={{ fontSize: '0.74rem', background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>
                    {rel.productGroup || 'Commercial'}
                  </span>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a', textAlign: 'center', lineHeight: 1.3 }}>
                    {rel.name.slice(0, 50)}...
                  </strong>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0284c7' }}>
                      ₹{Number(rel.sellingPrice).toLocaleString('en-IN')}
                    </span>
                    {rel.mrp && Number(rel.mrp) > Number(rel.sellingPrice) && (
                      <span style={{ fontSize: '0.78rem', textDecoration: 'line-through', color: '#94a3b8' }}>
                        ₹{Number(rel.mrp).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <button 
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      padding: '0.45rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                      marginTop: '0.25rem'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(rel, 1);
                    }}
                  >
                    <ShoppingBag size={14} /> Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FULL-SCREEN LIGHTBOX MODAL */}
      {showLightbox && (
        <div className="pdp-lightbox-overlay" onClick={() => setShowLightbox(false)}>
          <div className="pdp-lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <span style={{ fontWeight: 700, color: '#ffffff' }}>{product.name}</span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="lightbox-btn" onClick={() => setLightboxZoom(prev => Math.min(2.5, prev + 0.3))}>
                  <ZoomIn size={16} />
                </button>
                <button className="lightbox-btn" onClick={() => setLightboxZoom(prev => Math.max(1, prev - 0.3))}>
                  <ZoomOut size={16} />
                </button>
                <button className="lightbox-btn" onClick={() => setShowLightbox(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="lightbox-image-stage">
              <img 
                src={activeImage} 
                alt={product.name} 
                style={{ transform: `scale(${lightboxZoom})`, transition: 'transform 0.2s' }}
              />
            </div>

            <div className="lightbox-thumbs">
              {galleryList.map((img, i) => (
                <div 
                  key={i} 
                  className={`lightbox-thumb-item ${activeImage === img ? 'active' : ''}`}
                  onClick={() => setActiveImage(img)}
                >
                  <img src={img} alt={`thumb ${i}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WRITE A CUSTOMER REVIEW MODAL */}
      {showReviewModal && (
        <div className="pdp-lightbox-overlay" onClick={() => setShowReviewModal(false)}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '2rem', maxWidth: '520px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Write a Customer Review
              </h3>
              <button onClick={() => setShowReviewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  Star Rating:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setNewReview({ ...newReview, rating: num })}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: num <= newReview.rating ? '#f59e0b' : '#cbd5e1'
                      }}
                    >
                      <Star size={24} fill={num <= newReview.rating ? '#f59e0b' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  Your Full Name *:
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newReview.author}
                  onChange={(e) => setNewReview({ ...newReview, author: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  Your City / Business Location:
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Ahmedabad, Gujarat"
                  value={newReview.location}
                  onChange={(e) => setNewReview({ ...newReview, location: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  Headline / Review Title:
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Superfast delivery and authentic quality!"
                  value={newReview.title}
                  onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  Detailed Review Comment *:
                </label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Tell other buyers about packaging, billing invoice, dispatch time, or product durability..."
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowReviewModal(false)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLIDE-OUT CART DRAWER */}
      {isCartOpen && (
        <div className="cart-drawer-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <h3 className="cart-header-title">
                <ShoppingBag size={22} color="#0284c7" /> Shopping Cart ({totalCartCount})
              </h3>
              <button className="btn-close-drawer" onClick={() => setIsCartOpen(false)}>
                <X size={18} />
              </button>
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
                  <p style={{ fontSize: '0.85rem', margin: '0.35rem 0 1.25rem 0' }}>Add this item or browse other products in our store.</p>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      addToCart(product, quantity);
                    }}
                  >
                    Add Current Product ({quantity}x)
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

                  {/* INSTANT UPI QR CODE */}
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
                      onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                      style={{ padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                    <input 
                      type="tel" 
                      placeholder="WhatsApp Phone Number *" 
                      value={customerDetails.phone}
                      onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                      style={{ padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                    <input 
                      type="text" 
                      placeholder="Delivery Street Address / Landmark" 
                      value={customerDetails.address}
                      onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                      style={{ padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                    <input 
                      type="text" 
                      placeholder="City & Pincode" 
                      value={customerDetails.city}
                      onChange={(e) => setCustomerDetails({ ...customerDetails, city: e.target.value })}
                      style={{ padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                    <input 
                      type="text" 
                      placeholder="Special Instructions / GSTIN for ITC" 
                      value={customerDetails.note}
                      onChange={(e) => setCustomerDetails({ ...customerDetails, note: e.target.value })}
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
                  <span>Subtotal ({totalCartCount} items)</span>
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
        <div className="pdp-lightbox-overlay" onClick={() => setOrderConfirmed(null)}>
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
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* MOBILE STICKY BOTTOM BUY BAR */}
      <div className="pdp-mobile-sticky-bottom-bar">
        <div className="mobile-price-preview">
          <span>₹{(effectivePrice * quantity).toLocaleString('en-IN')}</span>
          <small>{quantity} {product.unit || 'PCS'}</small>
        </div>
        <button className="btn-mobile-sticky-cart" onClick={() => { addToCart(product, quantity); setIsCartOpen(true); }}>
          <ShoppingBag size={17} /> Add to Cart
        </button>
        <button className="btn-mobile-sticky-whatsapp" onClick={handleBuyOnWhatsApp}>
          <MessageCircle size={17} /> WhatsApp
        </button>
      </div>
    </div>
  );
};

export default DigitalCatalogProductDetail;
