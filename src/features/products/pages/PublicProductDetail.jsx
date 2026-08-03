import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Star,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  BadgeCheck,
  ShoppingCart,
  Zap,
  MapPin,
  Package,
  MessageSquare,
  Bookmark,
  Users,
  X
} from 'lucide-react';
import { useRef } from 'react';
import '@/features/products/styles/PublicProductDetail.css';

const PublicProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [zoomStyle, setZoomStyle] = useState({ display: 'none' });
  const [lensStyle, setLensStyle] = useState({ display: 'none' });
  const [isZooming, setIsZooming] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [toast, setToast] = useState(null);

  // Saved Supplier States (IndiaMART B2B Network)
  const [savedSupplierDoc, setSavedSupplierDoc] = useState(null);
  const [showSaveSupplierModal, setShowSaveSupplierModal] = useState(false);
  const [supplierTagInput, setSupplierTagInput] = useState('Trusted Seller');
  const [supplierNotesInput, setSupplierNotesInput] = useState('');

  // Review submission toggle and form states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviewerNameInput, setReviewerNameInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (user) {
      setReviewerNameInput(user.firstName ? `${user.firstName} ${user.lastName}` : user.username || '');
    }
  }, [user]);

  const mainImgRef = useRef(null);
  const containerRef = useRef(null);

  const showToast = (message, type = 'success', productInfo = null) => {
    setToast({ message, type, product: productInfo });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchWishlistStatus = async (productId) => {
    if (!user?.id || !productId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/marketplace/wishlist?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        const found = data.some(item => item.productId === productId);
        setIsWishlisted(found);
      }
    } catch (err) {
      console.error('Error fetching wishlist status:', err);
    }
  };

  const fetchSavedSupplierStatus = async (sellerId) => {
    if (!user?.id || !sellerId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/marketplace/saved-sellers?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        const found = data.find(item => item.sellerId === sellerId);
        setSavedSupplierDoc(found || null);
        if (found) {
          setSupplierTagInput(found.relationshipTag || 'Trusted Seller');
          setSupplierNotesInput(found.customNotes || '');
        }
      }
    } catch (err) {
      console.error('Error fetching saved supplier status:', err);
    }
  };

  const handleSaveSupplier = async (tag = supplierTagInput, notes = supplierNotesInput) => {
    if (!user?.id) {
      showToast('Please log in to save suppliers', 'error');
      return;
    }
    const sellerId = product?.userId;
    if (!sellerId) return;
    try {
      const response = await fetch('http://localhost:5000/api/marketplace/saved-sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          sellerId,
          relationshipTag: tag,
          customNotes: notes
        })
      });
      if (response.ok) {
        showToast(`Saved seller as "${tag}"`, 'success');
        setShowSaveSupplierModal(false);
        fetchSavedSupplierStatus(sellerId);
      } else {
        const err = await response.json();
        showToast(err.message || 'Error saving supplier', 'error');
      }
    } catch (err) {
      console.error('Error saving supplier:', err);
      showToast('Error saving supplier', 'error');
    }
  };

  const handleRemoveSupplier = async () => {
    if (!user?.id) return;
    const sellerId = product?.userId;
    if (!sellerId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/marketplace/saved-sellers?userId=${user.id}&sellerId=${sellerId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast('Supplier removed from saved list', 'info');
        setSavedSupplierDoc(null);
        setShowSaveSupplierModal(false);
      }
    } catch (err) {
      console.error('Error removing supplier:', err);
    }
  };

  const fetchReviews = async (sellerId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/reviews/${sellerId}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/public/product/${id}`);

        if (response.ok) {
          const data = await response.json();
          setProduct(data.product);
          setSeller(data.seller);

          if (data.product?._id) {
            if (user?.id) {
              fetchWishlistStatus(data.product._id);
              fetchSavedSupplierStatus(data.product.userId);
            }
            fetchReviews(data.product.userId);
          }
        }
      } catch (error) {
        console.error('Error loading product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, user]);

  const p = product?.data || product;

  const images = useMemo(() => {
    if (!p) return [];
    return [
      p.image,
      ...(p.images || []),
      ...(p.gallery || []),
      ...(p.productImages || []),
    ].filter(Boolean);
  }, [p]);

  const currentPrice = Number(
    p?.salePrice || p?.sellingPrice || p?.price || 0
  );

  const mrp = Number(p?.mrp || currentPrice);

  const discount = mrp > currentPrice
    ? Math.round(((mrp - currentPrice) / mrp) * 100)
    : 0;

  const bulletPoints = useMemo(() => {
    if (!p?.description) return [];
    const lines = p.description.split('\n').filter(line => line.trim());
    if (lines.length > 1) return lines;
    return p.description.split('.').filter(line => line.trim().length > 3);
  }, [p?.description]);

  // Dynamic Amazon-style Zoom logic using client coordinates relative to image container bounding box
  const handleMouseMove = (e) => {
    if (!mainImgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const bounds = container.getBoundingClientRect();

    // Zoom factor multiplier (2.5x magnifying power)
    const zoomFactor = 2.5;

    // Lens viewport dimensions proportional to zoom factor
    const lensWidth = bounds.width / zoomFactor;
    const lensHeight = bounds.height / zoomFactor;

    // Cursor coordinates centered inside the lens box
    let x = e.clientX - bounds.left - lensWidth / 2;
    let y = e.clientY - bounds.top - lensHeight / 2;

    // Clamp coordinates to stay bounded within main container
    x = Math.max(0, Math.min(x, bounds.width - lensWidth));
    y = Math.max(0, Math.min(y, bounds.height - lensHeight));

    setLensStyle({
      display: 'block',
      width: `${lensWidth}px`,
      height: `${lensHeight}px`,
      left: `${x}px`,
      top: `${y}px`
    });

    // Match exact coordinate shifts scaled to background dimensions
    const bgWidth = bounds.width * zoomFactor;
    const bgHeight = bounds.height * zoomFactor;
    const bgX = -x * zoomFactor;
    const bgY = -y * zoomFactor;

    setZoomStyle({
      display: 'block',
      backgroundImage: `url(${images[selectedImage]})`,
      backgroundSize: `${bgWidth}px ${bgHeight}px`,
      backgroundPosition: `${bgX}px ${bgY}px`
    });
  };

  const handleMouseEnter = () => {
    setIsZooming(true);
  };

  const handleMouseLeave = () => {
    setIsZooming(false);
    setZoomStyle({ display: 'none' });
    setLensStyle({ display: 'none' });
  };

  // Dynamic wholesale price extraction: Parse seller's custom text string (e.g. "10+ units @ 12% off")
  const parsedDiscountTier = useMemo(() => {
    if (!p?.tieredPricing) return null;
    try {
      const qtyMatch = p.tieredPricing.match(/(\d+)\+?\s*(?:qty|units|pcs|items)/i);
      const percentMatch = p.tieredPricing.match(/(\d+)%\s*(?:off|discount)?/i);

      if (qtyMatch && percentMatch) {
        return {
          minQty: Number(qtyMatch[1]),
          discountPercent: Number(percentMatch[1]) / 100
        };
      }
    } catch (e) {
      console.error('Error parsing tiered pricing tags:', e);
    }
    return null;
  }, [p?.tieredPricing]);

  // Determine dynamic wholesale discount rate based on selected qty
  const tierDiscountPercent = useMemo(() => {
    if (parsedDiscountTier && quantity >= parsedDiscountTier.minQty) {
      return parsedDiscountTier.discountPercent;
    }
    return 0;
  }, [parsedDiscountTier, quantity]);

  const tierDiscountedPrice = currentPrice * (1 - tierDiscountPercent);
  const totalAmount = tierDiscountedPrice * quantity;
  const savingsPerUnit = Math.max(mrp - tierDiscountedPrice, 0);

  const handleAddToCart = async () => {
    if (!user?.id) {
      showToast('Please log in to add items to cart', 'error');
      return;
    }
    const productId = product?._id;
    if (!productId) return;
    try {
      const response = await fetch('http://localhost:5000/api/marketplace/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId, quantity: Number(quantity) })
      });
      if (response.ok) {
        showToast('Added to cart', 'success', { name: p.name, image: p.image });
      } else {
        showToast('Failed to add to cart', 'error');
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      showToast('Error adding to cart', 'error');
    }
  };

  const handleToggleWishlist = async () => {
    if (!user?.id) {
      showToast('Please log in to manage wishlist', 'error');
      return;
    }
    const productId = product?._id;
    if (!productId) return;
    try {
      if (isWishlisted) {
        const response = await fetch(`http://localhost:5000/api/marketplace/wishlist?userId=${user.id}&productId=${productId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          setIsWishlisted(false);
          showToast('Removed from wishlist', 'info', { name: p.name, image: p.image });
        } else {
          showToast('Failed to remove from wishlist', 'error');
        }
      } else {
        const response = await fetch('http://localhost:5000/api/marketplace/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, productId })
        });
        if (response.ok) {
          setIsWishlisted(true);
          showToast('Saved to wishlist', 'success', { name: p.name, image: p.image });
        } else {
          showToast('Failed to save to wishlist', 'error');
        }
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
      showToast('Error updating wishlist', 'error');
    }
  };

  const handleBuyNow = async () => {
    if (!user?.id) {
      showToast('Please log in to checkout', 'error');
      return;
    }
    const productId = product?._id;
    if (!productId) return;
    showToast('Processing simulated B2B checkout...', 'info');
    try {
      const addResponse = await fetch('http://localhost:5000/api/marketplace/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId, quantity: Number(quantity) })
      });
      if (addResponse.ok) {
        setTimeout(() => {
          showToast('B2B Quote request submitted successfully!', 'success');
          fetch(`http://localhost:5000/api/marketplace/cart/clear?userId=${user.id}`, { method: 'DELETE' });
        }, 1500);
      } else {
        showToast('Checkout failed', 'error');
      }
    } catch (err) {
      showToast('Checkout failed', 'error');
    }
  };

  const handleShareProduct = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Product link copied to clipboard!', 'success');
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      showToast('Please log in to submit a review', 'error');
      return;
    }
    if (!newComment.trim()) {
      showToast('Please write feedback comments', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      const response = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: product.userId,
          reviewerId: user.id,
          reviewerName: reviewerNameInput.trim() || user.username || 'Anonymous Client',
          rating: newRating,
          text: newComment
        })
      });
      if (response.ok) {
        showToast('Review submitted successfully!', 'success');
        setNewComment('');
        setNewRating(5);
        setShowReviewForm(false);
        fetchReviews(product.userId);
      } else {
        showToast('Failed to submit review', 'error');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      showToast('Error submitting review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="pdp-loading-screen">
        <div className="pdp-loader"></div>
        <p>Loading Product...</p>
      </div>
    );
  }

  if (!product) {
    return <div className="pdp-error">Product not found</div>;
  }

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 2);
  const formattedDelivery = deliveryDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  // Calculate average rating dynamically
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "5.0";

  // Dynamic user delivery location
  const userLocation = user?.city && user?.state
    ? `${user.city}, ${user.state}`
    : user?.city || user?.state || "your business location";

  // Dynamic policies parsed from seller profile
  const dynamicReturnPolicy = seller?.professionalProfile?.returnPolicy || "Merchant standard replacement coverage applies";
  const dynamicShippingPolicy = seller?.professionalProfile?.shippingPolicy || "Standard logistics delivery times apply";
  const dynamicGstin = seller?.professionalProfile?.gstin || seller?.gstin;

  return (
    <div className="amazon-pdp-container">
      {/* Premium Toast Notification */}
      {toast && (
        <div className="premium-toast">
          {toast.product?.image ? (
            <img src={toast.product.image} alt={toast.product.name} className="toast-img" />
          ) : (
            <div className="toast-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8' }}>
              <Package size={20} />
            </div>
          )}
          <div className="toast-content-wrapper">
            <h5 className="toast-title">
              {toast.type === 'error' ? '❌ Error' : toast.type === 'info' ? 'ℹ️ Notice' : '🎉 Added to Cart!'}
            </h5>
            <p className="toast-desc">{toast.product?.name || toast.message}</p>
            <div className="toast-actions">
              {toast.type === 'success' && (
                <button className="toast-btn toast-btn-primary" onClick={() => { navigate('/store'); }}>
                  Go to Marketplace Cart
                </button>
              )}
              <button className="toast-btn toast-btn-secondary" onClick={() => setToast(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="amazon-pdp">
        {/* Breadcrumb */}
        <div className="pdp-breadcrumbs">
          <span onClick={() => navigate('/store')}>Marketplace Store</span>
          <span>/</span>
          <span onClick={() => navigate(`/p/${product.userId}`)}>{seller?.companyName || 'Seller'} Store</span>
          <span>/</span>
          <span className="active">{p.name}</span>
        </div>

        <div className="pdp-layout">
          {/* LEFT MEDIA GALLERY */}
          <div className="pdp-gallery-section">
            <div className="pdp-gallery-wrapper">
              {/* THUMBNAILS */}
              <div className="pdp-thumbnails">
                {images.map((img, index) => (
                  <button
                    key={index}
                    className={`pdp-thumb ${selectedImage === index ? 'active' : ''}`}
                    onMouseEnter={() => setSelectedImage(index)}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={img} alt={`thumb-${index}`} />
                  </button>
                ))}
              </div>

              {/* MAIN IMAGE */}
              <div
                ref={containerRef}
                className="pdp-main-image-box"
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {images.length > 0 ? (
                  <>
                    <img
                      ref={mainImgRef}
                      src={images[selectedImage]}
                      alt={p.name}
                      className="pdp-main-image"
                    />
                    <div className="pdp-lens" style={lensStyle}></div>

                    {images.length > 1 && (
                      <>
                        <button className="gallery-arrow left" onClick={() => setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1)}>
                          <ChevronLeft size={22} />
                        </button>

                        <button className="gallery-arrow right" onClick={() => setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1)}>
                          <ChevronRight size={22} />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="pdp-no-image">
                    <Package size={90} />
                  </div>
                )}
                {discount > 0 && (
                  <div className="pdp-discount-overlay-badge">
                    {discount}% OFF
                  </div>
                )}
              </div>
            </div>

            {/* Quick Sharing actions under gallery */}
            <div className="pdp-gallery-share-row">
              <button className="gallery-share-btn" onClick={handleShareProduct}>
                <Share2 size={16} /> Share Product Link
              </button>
            </div>
          </div>

          {/* RIGHT DETAILED INFO COLUMN */}
          <div className="pdp-info-column">
            {/* ZOOM PANEL (Aligned to overlap right details area during hover zoom) */}
            <div className="pdp-zoom-result" style={zoomStyle}></div>

            {/* Header info */}
            <div className="brand-line" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span>Visit the <span className="brand-link-text" onClick={() => navigate(`/p/${product.userId}`)}>{seller?.companyName || 'Premium'} Store</span></span>
                <span className="gst-verified-badge" style={{ marginLeft: '8px' }}>
                  <BadgeCheck size={14} fill="#0d8abc" color="white" /> Verified GST Merchant
                </span>
              </div>
              <button 
                className="add-review-trigger-btn"
                style={{ 
                  background: savedSupplierDoc ? 'rgba(13, 138, 188, 0.1)' : '#0d8abc',
                  color: savedSupplierDoc ? '#0d8abc' : 'white',
                  border: savedSupplierDoc ? '1px solid rgba(13, 138, 188, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
                onClick={() => setShowSaveSupplierModal(true)}
              >
                <Bookmark size={14} fill={savedSupplierDoc ? '#0d8abc' : 'none'} />
                {savedSupplierDoc ? `⭐ ${savedSupplierDoc.relationshipTag || 'Saved Supplier'}` : '+ Save Seller'}
              </button>
            </div>

            <h1 className="pdp-title">{p.name}</h1>

            <div className="pdp-rating-row">
              <div className="stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} fill={s <= Math.round(Number(avgRating)) ? "#f59e0b" : "none"} color={s <= Math.round(Number(avgRating)) ? "#f59e0b" : "#cbd5e1"} />
                ))}
              </div>
              <span className="rating-count">{avgRating}</span>
              <span className="reviews-link">({reviews.length} Merchant Reviews)</span>
            </div>

            <hr />

            {/* Price & Savings Display */}
            <div className="pdp-price-container">
              <div className="pdp-deal-badge-row">
                <span className="deal-tag">Deal of the Day</span>
                {savingsPerUnit > 0 && (
                  <span className="savings-highlight-tag">Save ₹{(savingsPerUnit * quantity).toLocaleString()} Today</span>
                )}
              </div>

              <div className="price-section">
                {discount > 0 && (
                  <span className="discount-badge">-{discount}%</span>
                )}
                <div className="main-price">
                  <span className="rupee">₹</span>
                  {currentPrice.toLocaleString()}
                  <span className="price-unit"> / {p.unit || 'Unit'}</span>
                </div>
              </div>

              {mrp > currentPrice && (
                <div className="mrp-line">
                  List Price (M.R.P.): <span>₹{mrp.toLocaleString()}</span>
                </div>
              )}

              <div className="tax-text">
                Prices include all applicable taxes. GST Input Tax Credit (ITC) invoice will be provided.
              </div>
            </div>

            {/* Dynamic Wholesale/Bulk Discounts Box - Only renders if the seller has tiered pricing setup */}
            {p.tieredPricing && (
              <div className="wholesale-tiers-box">
                <span className="tiers-title">🔥 Seller B2B Bulk Discounts</span>
                <div className="custom-tier-pricing-banner">
                  <span className="tier-discount">{p.tieredPricing}</span>
                </div>
                {parsedDiscountTier && (
                  <div className="parsed-tier-hint">
                    Select <strong>{parsedDiscountTier.minQty}</strong> or more units to unlock <strong>{parsedDiscountTier.discountPercent * 100}% off</strong> automatically at checkout.
                  </div>
                )}
              </div>
            )}

            {/* Elevated B2B Buy box inside the flow */}
            <div className="pdp-buy-widget">
              <div className="buy-widget-header">
                <span className="widget-title">Order Checklist</span>
                <span className={`stock-status-pill ${p.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                  {p.stock > 0 ? 'In Stock & Ready' : 'Out of Stock'}
                </span>
              </div>

              <div className="buy-widget-price-row">
                <div className="widget-price-details">
                  <span className="price-label">Price per unit</span>
                  <span className="price-value">
                    ₹{tierDiscountedPrice.toLocaleString()}
                    {tierDiscountPercent > 0 && <span className="discount-note">(-{tierDiscountPercent * 100}%)</span>}
                  </span>
                </div>
                <div className="widget-price-details text-right">
                  <span className="price-label">Estimated Subtotal</span>
                  <span className="price-value subtotal">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="buy-widget-actions-grid">
                <div className="widget-qty-selector">
                  <label>Quantity</label>
                  <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
                    {[...Array(30).keys()].map(n => (
                      <option key={n + 1} value={n + 1}>{n + 1} {p.unit || 'Units'}</option>
                    ))}
                  </select>
                </div>

                <div className="widget-shipping-info">
                  <Truck size={16} />
                  <div>
                    <span>FREE Delivery by <strong>{formattedDelivery}</strong></span>
                    <span className="location-pin"><MapPin size={11} /> Ship to {userLocation}</span>
                  </div>
                </div>
              </div>

              <div className="widget-buttons">
                <button className="widget-btn-cart" onClick={handleAddToCart} disabled={p.stock <= 0}>
                  <ShoppingCart size={18} /> Add to Cart
                </button>
                <button className="widget-btn-buy" onClick={handleBuyNow} disabled={p.stock <= 0}>
                  <Zap size={18} /> Buy Now
                </button>
              </div>

              <div className="widget-secondary-actions">
                <button
                  className={`widget-action-btn ${isWishlisted ? 'active' : ''}`}
                  onClick={handleToggleWishlist}
                >
                  <Heart size={16} fill={isWishlisted ? '#ef4444' : 'none'} />
                  {isWishlisted ? 'Saved to Wishlist' : 'Add to Wishlist'}
                </button>
                <div className="secure-tag">
                  <ShieldCheck size={14} /> 100% Protected Checkout
                </div>
              </div>
            </div>

            {/* DYNAMIC B2B TRUST HIGHLIGHTS */}
            <div className="trust-highlights-grid">
              <div className="trust-item">
                <ShieldCheck size={20} className="trust-icon" />
                <div>
                  <strong>Secure Checkout</strong>
                  <p>Escrow payment protection active for purchases from {seller?.companyName || 'merchants'}</p>
                </div>
              </div>
              <div className="trust-item">
                <BadgeCheck size={20} className="trust-icon" />
                <div>
                  <strong>GST ITC Invoices</strong>
                  {dynamicGstin ? (
                    <p>Compliant invoice eligible for tax credit issued with GSTIN {dynamicGstin}</p>
                  ) : (
                    <p>B2B business sale invoices with valid HSN/SAC codes provided</p>
                  )}
                </div>
              </div>
              <div className="trust-item">
                <RotateCcw size={20} className="trust-icon" />
                <div>
                  <strong>Return coverage</strong>
                  <p>{dynamicReturnPolicy}</p>
                </div>
              </div>
            </div>

            <hr />

            {/* ABOUT */}
            <div className="about-section">
              <h3>Product description & details</h3>
              {bulletPoints.length > 0 ? (
                <ul>
                  {bulletPoints.map((point, index) => (
                    <li key={index}>{point.trim()}</li>
                  ))}
                </ul>
              ) : (
                <p className="empty-desc">No product description available.</p>
              )}
            </div>

            <hr />

            {/* SPECIFICATIONS */}
            <div className="specifications-section">
              <h3>Technical Specifications</h3>
              <div className="spec-list">
                <div className="spec-item">
                  <span className="spec-name">Manufacturer / Brand</span>
                  <span className="spec-divider-dots"></span>
                  <span className="spec-value">{seller?.companyName || 'Generic'}</span>
                </div>

                <div className="spec-item">
                  <span className="spec-name">Product Group</span>
                  <span className="spec-divider-dots"></span>
                  <span className="spec-value">{p.productGroup || 'General'}</span>
                </div>

                <div className="spec-item">
                  <span className="spec-name">HSN Code</span>
                  <span className="spec-divider-dots"></span>
                  <span className="spec-value">{p.hsn || 'N/A'}</span>
                </div>

                <div className="spec-item">
                  <span className="spec-name">Sales Unit</span>
                  <span className="spec-divider-dots"></span>
                  <span className="spec-value">{p.unit || 'PCS'}</span>
                </div>

                <div className="spec-item">
                  <span className="spec-name">GST Tax Rate</span>
                  <span className="spec-divider-dots"></span>
                  <span className="spec-value">{p.taxRate || 0}% GST</span>
                </div>

                <div className="spec-item">
                  <span className="spec-name">Shipping Speed</span>
                  <span className="spec-divider-dots"></span>
                  <span className="spec-value">{dynamicShippingPolicy}</span>
                </div>

                <div className="spec-item">
                  <span className="spec-name">Stock Status</span>
                  <span className="spec-divider-dots"></span>
                  <span className="spec-value" style={{ color: p.stock > 0 ? '#057642' : '#cc0c39', fontWeight: 'bold' }}>
                    {p.stock > 0 ? `In Stock (${p.stock} units)` : 'Out of Stock'}
                  </span>
                </div>

                {p.batch && (
                  <div className="spec-item">
                    <span className="spec-name">Batch ID</span>
                    <span className="spec-divider-dots"></span>
                    <span className="spec-value">{p.batch}</span>
                  </div>
                )}

                {p.expiry && (
                  <div className="spec-item">
                    <span className="spec-name">Expiration Date</span>
                    <span className="spec-divider-dots"></span>
                    <span className="spec-value">{p.expiry}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Real Review Submission Form and Merchant Reviews Panel at bottom */}
        <div className="pdp-reviews-section">
          <div className="reviews-header-bar">
            <h3>Ratings & Reviews</h3>
            <button className="add-review-trigger-btn" onClick={() => setShowReviewForm(!showReviewForm)}>
              {showReviewForm ? 'Cancel Review' : 'Write a Customer Review'}
            </button>
          </div>

          <div className="reviews-layout">
            {/* Submit Review Card (Only displays when toggled by write review button) */}
            {showReviewForm && (
              <div className="submit-review-card glass animated-slide">
                <h4>Write a Review for {seller?.companyName || 'this Merchant'}</h4>
                {user ? (
                  <form onSubmit={handleSubmitReview} className="review-form">
                    <div className="form-group">
                      <label>Rating</label>
                      <div className="star-rating-selector">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            className="star-selector-btn"
                            onClick={() => setNewRating(star)}
                          >
                            <Star
                              size={24}
                              fill={star <= newRating ? "#f59e0b" : "none"}
                              color={star <= newRating ? "#f59e0b" : "#cbd5e1"}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Your Display Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. John Doe"
                        value={reviewerNameInput}
                        onChange={(e) => setReviewerNameInput(e.target.value)}
                        required
                        style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Your Feedback</label>
                      <textarea
                        placeholder="Share your experience working with this merchant..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={4}
                        required
                      />
                    </div>
                    <button type="submit" className="submit-review-btn" disabled={submittingReview}>
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                ) : (
                  <div className="login-prompt">
                    <p>You must be logged in to review merchants.</p>
                    <button className="login-link-btn" onClick={() => navigate('/login')}>
                      Log In
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Reviews List */}
            <div className={`reviews-list-area ${showReviewForm ? 'contracted' : 'expanded'}`}>
              {reviews.length === 0 ? (
                <p className="no-reviews-text">No reviews yet for this merchant. Be the first to leave a review!</p>
              ) : (
                <div className="reviews-list">
                  {reviews.map((rev) => (
                    <div key={rev._id} className="review-card glass">
                      <div className="review-header">
                        <span className="reviewer-name">{rev.reviewerName}</span>
                        <div className="review-rating">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              fill={i < rev.rating ? "#f59e0b" : "none"}
                              color={i < rev.rating ? "#f59e0b" : "#cbd5e1"}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="review-date">{new Date(rev.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <p className="review-text">{rev.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Supplier Modal Dialog (IndiaMART Network) */}
      {showSaveSupplierModal && (
        <div className="supplier-modal-backdrop" onClick={() => setShowSaveSupplierModal(false)}>
          <div className="supplier-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="supplier-modal-header">
              <h4>Save Seller to My Suppliers (IndiaMART)</h4>
              <button className="drawer-close-btn" onClick={() => setShowSaveSupplierModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Select Relationship Badge:</label>
              <div className="tag-options-grid">
                {['Trusted Seller', 'Our Seller', 'Seller You Buy From', 'My Connection', 'Preferred Supplier'].map(tag => (
                  <button
                    key={tag}
                    className={`tag-option-btn ${supplierTagInput === tag ? 'active' : ''}`}
                    onClick={() => setSupplierTagInput(tag)}
                  >
                    ⭐ {tag}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Private Business Notes:</label>
              <textarea
                placeholder="e.g. Net-30 credit terms agreed. Contact Ramesh for bulk order discounts..."
                value={supplierNotesInput}
                onChange={(e) => setSupplierNotesInput(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {savedSupplierDoc ? (
                <button className="drawer-btn drawer-btn-secondary" style={{ color: '#ef4444' }} onClick={handleRemoveSupplier}>
                  Remove Supplier
                </button>
              ) : <div />}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="drawer-btn drawer-btn-secondary" onClick={() => setShowSaveSupplierModal(false)}>
                  Cancel
                </button>
                <button className="drawer-btn drawer-btn-primary" onClick={() => handleSaveSupplier()}>
                  Save Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProductDetail;