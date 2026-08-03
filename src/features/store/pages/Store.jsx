import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Search, 
  Star,
  ExternalLink,
  Compass,
  ShoppingCart,
  Heart,
  X,
  Plus,
  Minus,
  Trash2,
  Users,
  Bookmark,
  ShieldCheck,
  Building2,
  MessageSquare,
  MapPin,
  Edit2,
  Grid,
  Zap,
  TrendingUp,
  Tag,
  Sparkles
} from 'lucide-react';
import StoreNavbar from '@/features/store/components/StoreNavbar';
import StoreBottomNav from '@/features/store/components/StoreBottomNav';
import '@/features/store/styles/Store.css';



// Helper to render Business Logo Box
const BusinessLogo = ({ name, image, size = 'md', className = '' }) => {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '??';
  
  return (
    <div className={`business-logo-box ${size} ${className}`} style={{ overflow: 'hidden' }}>
      {image ? (
        <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials
      )}
    </div>
  );
};

const Store = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Cart & Wishlist States
  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Saved Sellers (IndiaMART Supplier Network)
  const [savedSellers, setSavedSellers] = useState([]);
  const [isSavedSellersOpen, setIsSavedSellersOpen] = useState(false);
  const [editingNotesSeller, setEditingNotesSeller] = useState(null);
  const [editTagInput, setEditTagInput] = useState('Trusted Seller');
  const [editNotesInput, setEditNotesInput] = useState('');



  useEffect(() => {
    fetchMarketplaceProducts();
    if (user?.id) {
      fetchCart();
      fetchWishlist();
      fetchSavedSellers();
    }
  }, [user]);

  const showToast = (message, type = 'success', product = null) => {
    setToast({ message, type, product });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchCart = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/marketplace/cart?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setCartItems(data);
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
    }
  };

  const fetchWishlist = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/marketplace/wishlist?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setWishlistItems(data);
      }
    } catch (err) {
      console.error('Error fetching wishlist:', err);
    }
  };

  const fetchSavedSellers = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`http://localhost:5000/api/marketplace/saved-sellers?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSavedSellers(data);
      }
    } catch (err) {
      console.error('Error fetching saved sellers:', err);
    }
  };

  const handleSaveSeller = async (sellerId, relationshipTag = 'Trusted Seller', customNotes = '', e) => {
    if (e) e.stopPropagation();
    if (!user?.id) {
      showToast('Please log in to save suppliers', 'error');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/marketplace/saved-sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, sellerId, relationshipTag, customNotes })
      });
      if (response.ok) {
        showToast(`Saved supplier as "${relationshipTag}"`, 'success');
        fetchSavedSellers();
        fetchMarketplaceProducts();
      } else {
        const err = await response.json();
        showToast(err.message || 'Failed to save supplier', 'error');
      }
    } catch (err) {
      console.error('Error saving supplier:', err);
      showToast('Error saving supplier', 'error');
    }
  };

  const handleRemoveSavedSeller = async (sellerId, e) => {
    if (e) e.stopPropagation();
    if (!user?.id) return;
    try {
      const response = await fetch(`http://localhost:5000/api/marketplace/saved-sellers?userId=${user.id}&sellerId=${sellerId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast('Supplier removed from saved list', 'info');
        fetchSavedSellers();
        fetchMarketplaceProducts();
      }
    } catch (err) {
      console.error('Error removing saved seller:', err);
    }
  };

  const handleAddToCart = async (productId, quantity = 1, e) => {
    if (e) e.stopPropagation();
    if (!user?.id) {
      showToast('Please log in to add items to cart', 'error');
      return;
    }
    const productDetail = products.find(p => p._id === productId);
    const prodName = productDetail?.data?.name || 'Product';
    const prodImg = productDetail?.data?.image || null;

    try {
      const response = await fetch('http://localhost:5000/api/marketplace/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId, quantity })
      });
      if (response.ok) {
        showToast('Added to cart', 'success', { name: prodName, image: prodImg });
        fetchCart();
      } else {
        showToast('Failed to add to cart', 'error');
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      showToast('Error adding to cart', 'error');
    }
  };

  const handleToggleWishlist = async (productId, e) => {
    if (e) e.stopPropagation();
    if (!user?.id) {
      showToast('Please log in to manage wishlist', 'error');
      return;
    }
    const isWishlisted = wishlistItems.some(item => item.productId === productId);
    const productDetail = products.find(p => p._id === productId);
    const prodName = productDetail?.data?.name || 'Product';
    const prodImg = productDetail?.data?.image || null;

    try {
      if (isWishlisted) {
        const response = await fetch(`http://localhost:5000/api/marketplace/wishlist?userId=${user.id}&productId=${productId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          showToast('Removed from wishlist', 'info', { name: prodName, image: prodImg });
          fetchWishlist();
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
          showToast('Saved to wishlist', 'success', { name: prodName, image: prodImg });
          fetchWishlist();
        } else {
          showToast('Failed to add to wishlist', 'error');
        }
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
      showToast('Error updating wishlist', 'error');
    }
  };

  const handleUpdateCartQty = async (productId, currentQty, delta) => {
    const newQty = currentQty + delta;
    if (!user?.id) return;
    try {
      const response = await fetch('http://localhost:5000/api/marketplace/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId, quantity: newQty })
      });
      if (response.ok) {
        fetchCart();
      }
    } catch (err) {
      console.error('Error updating cart quantity:', err);
    }
  };

  const handleRemoveFromCart = async (productId) => {
    if (!user?.id) return;
    try {
      const response = await fetch(`http://localhost:5000/api/marketplace/cart?userId=${user.id}&productId=${productId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast('Item removed from cart', 'success');
        fetchCart();
      }
    } catch (err) {
      console.error('Error removing from cart:', err);
    }
  };

  const handleClearCart = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`http://localhost:5000/api/marketplace/cart/clear?userId=${user.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast('Cart cleared', 'success');
        fetchCart();
      }
    } catch (err) {
      console.error('Error clearing cart:', err);
    }
  };

  const handleSaveForLater = async (productId, e) => {
    if (e) e.stopPropagation();
    if (!user?.id) return;
    try {
      // Add to wishlist
      const wishlistRes = await fetch('http://localhost:5000/api/marketplace/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId })
      });
      // Remove from cart
      if (wishlistRes.ok) {
        await fetch(`http://localhost:5000/api/marketplace/cart?userId=${user.id}&productId=${productId}`, {
          method: 'DELETE'
        });
        showToast('Moved to wishlist for later!', 'success');
        fetchCart();
        fetchWishlist();
      }
    } catch (err) {
      console.error('Error saving for later:', err);
    }
  };

  const handleCheckout = () => {
    showToast('Submitting bulk quote requests to sellers...', 'info');
    setTimeout(async () => {
      // Auto-connect cart sellers as "Seller You Buy From" (IndiaMART style)
      if (user?.id) {
        const uniqueSellerIds = [...new Set(cartItems.map(item => item.product?.userId).filter(Boolean))];
        for (const sellerId of uniqueSellerIds) {
          try {
            await fetch('http://localhost:5000/api/marketplace/saved-sellers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                sellerId,
                relationshipTag: 'Seller You Buy From',
                isAutoConnected: true
              })
            });
          } catch (e) {
            console.error('Error auto-saving seller:', e);
          }
        }
        fetchSavedSellers();
      }

      await handleClearCart();
      setIsCartOpen(false);
      showToast('B2B Quotes requested! Sellers added to "Sellers You Buy From"', 'success');
    }, 1500);
  };

  const fetchMarketplaceProducts = async (query = '') => {
    setIsLoading(true);
    try {
      const url = `http://localhost:5000/api/marketplace/products?userId=${user?.id || ''}${query ? `&search=${query}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching marketplace products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const trackInteraction = async (productId, productGroup, type = 'view') => {
    if (!user?.id) return;
    try {
      await fetch('http://localhost:5000/api/marketplace/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          productId,
          productGroup,
          type
        })
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchMarketplaceProducts(query);
  };

  const filteredProducts = products;

  // Free shipping & savings calculations
  const subtotal = cartItems.reduce((sum, item) => {
    const prod = item.product || {};
    const pData = prod.data || {};
    const price = Number(pData.salePrice || pData.sellingPrice || pData.price || 0);
    return sum + (price * item.quantity);
  }, 0);

  const FREE_SHIPPING_THRESHOLD = 10000;
  const progressPercent = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD - subtotal;

  const totalSavings = cartItems.reduce((sum, item) => {
    const prod = item.product || {};
    const pData = prod.data || {};
    const price = Number(pData.salePrice || pData.sellingPrice || pData.price || 0);
    const mrp = Number(pData.mrp || price);
    const savingsPerUnit = Math.max(mrp - price, 0);
    return sum + (savingsPerUnit * item.quantity);
  }, 0);

  return (
    <div className="store-container">
      {/* Amazon & Flipkart Style Store Main Navigation Header */}
      <StoreNavbar 
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        cartCount={cartItems.length}
        wishlistCount={wishlistItems.length}
        suppliersCount={savedSellers.length}
      />

      {/* Hero Banner Section */}
      <div className="store-header-banner glass">
        <div className="banner-content">
          <span className="banner-tag"><Compass size={14} /> Wholesale B2B Marketplace</span>
          <h2>Discover Products & Wholesale Deals</h2>
          <p>Connect with GST verified suppliers, source quality inventory at factory prices, and streamline bulk ordering.</p>
        </div>
        <div className="banner-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="banner-hero-badge">
            <ShieldCheck size={28} color="#10b981" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>GST Verified Merchants</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>100% Tax Compliant Supply Chain</span>
            </div>
          </div>
        </div>
      </div>

      <div className="store-content-layout">
        {/* Main Grid Area */}
        <div className="store-main-area">

          {/* Product Feed */}
          {isLoading ? (
            <div className="store-loading-state">
              <div className="loading-spinner"></div>
              <p>Discovering best business products for you...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="store-empty-state glass">
              <ShoppingBag size={48} />
              <h3>No products found</h3>
              <p>{searchQuery ? `No products matching "${searchQuery}".` : "The store is quiet today. Check back soon!"}</p>
            </div>
          ) : (
            <div className="store-products-grid">
              {filteredProducts.map(p => {
                const prod = p.data || {};
                const currentPrice = Number(prod.salePrice || prod.sellingPrice || prod.price || 0);
                const mrp = Number(prod.mrp || currentPrice);
                const itemSavings = Math.max(mrp - currentPrice, 0);
                const savedRel = p.savedRelation;

                return (
                  <div 
                    key={p._id} 
                    className="store-product-card glass"
                    onClick={() => {
                      trackInteraction(p._id, p.data?.productGroup, 'click');
                      navigate(`/product/${p._id || p.data?.id}`);
                    }}
                  >
                    <div className="product-image-box">
                      {p.data?.image ? (
                        <img src={p.data.image} alt={p.data.name} />
                      ) : (
                        <div className="fallback-image-icon">
                          <ShoppingBag size={40} />
                        </div>
                      )}
                      {p.recommendationScore > 20 && (
                        <div className="match-badge">Best Match</div>
                      )}
                      
                      {/* Quick Action Overlay (Bookmark Supplier & Add to Cart - Wishlist moved to Account!) */}
                      <div className="card-quick-actions">
                        <button 
                          className={`quick-action-btn ${savedRel?.isSaved ? 'wishlisted' : ''}`}
                          title={savedRel?.isSaved ? `Saved as ${savedRel.relationshipTag}` : "Save Seller to My Suppliers"}
                          onClick={(e) => {
                            if (savedRel?.isSaved) {
                              handleRemoveSavedSeller(p.userId, e);
                            } else {
                              handleSaveSeller(p.userId, 'Trusted Seller', '', e);
                            }
                          }}
                        >
                          <Bookmark size={16} fill={savedRel?.isSaved ? '#0d8abc' : 'none'} color={savedRel?.isSaved ? '#0d8abc' : 'currentColor'} />
                        </button>
                        <button 
                          className="quick-action-btn cart-add-btn"
                          title="Add to Cart"
                          onClick={(e) => handleAddToCart(p._id, 1, e)}
                        >
                          <ShoppingCart size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="product-details-box">
                      <div className="category-label-row">
                        <span className="category-tag">{p.data?.productGroup || 'General'}</span>
                        <span className="flipkart-assured-chip">✨ B2B Assured</span>
                      </div>
                      <h4 className="product-title">{p.data?.name}</h4>
                      
                      {itemSavings > 0 && (
                        <span className="drawer-savings-badge">Save ₹{itemSavings.toLocaleString()} ({Math.round((itemSavings / mrp) * 100)}% OFF)</span>
                      )}

                      <div className="price-and-action">
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                          <span className="product-selling-price">₹{currentPrice.toLocaleString()}</span>
                          {mrp > currentPrice && (
                            <span className="product-mrp-price">₹{mrp.toLocaleString()}</span>
                          )}
                        </div>
                        <button className="view-product-btn" title="View details">
                          <ExternalLink size={14} />
                        </button>
                      </div>
                      <div className="merchant-info-mini">
                        <BusinessLogo name={p.sellerName} image={p.sellerLogo} size="xs" />
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                          <span className="merchant-name">{p.sellerName}</span>
                          {savedRel?.isSaved && (
                            <span className={`saved-supplier-pill ${savedRel.relationshipTag === 'Trusted Seller' ? 'trusted' : savedRel.relationshipTag === 'Our Seller' ? 'our-seller' : savedRel.relationshipTag === 'Seller You Buy From' ? 'buy-from' : ''}`}>
                              ⭐ {savedRel.relationshipTag}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar widget area */}
        <div className="store-sidebar-area">
          <div className="sidebar-promo-widget glass">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Zap size={20} color="#0d8abc" />
              <h3 style={{ margin: 0 }}>Marketplace Hub</h3>
            </div>
            <p>Access your saved suppliers, cart, wishlist, and business profile directly from the Account tab.</p>
            <button 
              className="btn btn-outline" 
              onClick={() => navigate('/store/account')} 
              style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              Go to Your Account Hub
            </button>
          </div>

          <div className="sidebar-promo-widget glass">
            <h3>Verified B2B Suppliers Spotlight</h3>
            <div className="trending-sellers-list">
              {/* Unique Sellers from products list */}
              {[...new Map(products.map(item => [item.sellerName, item])).values()].slice(0, 4).map(p => (
                <div key={p._id} className="trending-seller-item clickable" onClick={() => navigate(`/p/${p.sellerId}`)}>
                  <BusinessLogo name={p.sellerName} image={p.sellerLogo} size="sm" />
                  <div className="seller-meta">
                    <span className="seller-title">{p.sellerName}</span>
                    <span className="seller-subtitle"><ShieldCheck size={11} color="#10b981" style={{ display: 'inline', marginRight: '2px' }} /> Verified GST Merchant</span>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <p className="text-muted text-center" style={{ fontSize: '0.85rem' }}>No trending merchants today.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Toast Notification */}
      {toast && (
        <div className="premium-toast">
          {toast.product?.image ? (
            <img src={toast.product.image} alt={toast.product.name} className="toast-img" />
          ) : (
            <div className="toast-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8' }}>
              <ShoppingBag size={20} />
            </div>
          )}
          <div className="toast-content-wrapper">
            <h5 className="toast-title">
              {toast.type === 'error' ? '❌ Error' : toast.type === 'info' ? 'ℹ️ Notice' : '🎉 Action Complete'}
            </h5>
            <p className="toast-desc">{toast.product?.name || toast.message}</p>
            <div className="toast-actions">
              {toast.type === 'success' && (
                <button className="toast-btn toast-btn-primary" onClick={() => { setIsCartOpen(true); setToast(null); }}>
                  View Cart
                </button>
              )}
              <button className="toast-btn toast-btn-secondary" onClick={() => setToast(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side Drawer Backdrop */}
      <div 
        className={`drawer-backdrop ${(isCartOpen || isWishlistOpen || isSavedSellersOpen) ? 'open' : ''}`}
        onClick={() => {
          setIsCartOpen(false);
          setIsWishlistOpen(false);
          setIsSavedSellersOpen(false);
        }}
      />

      {/* IndiaMART Style My Suppliers Side Drawer */}
      <div className={`drawer-container ${isSavedSellersOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3><Users size={20} color="#0d8abc" /> My Suppliers ({savedSellers.length})</h3>
          <button className="drawer-close-btn" onClick={() => setIsSavedSellersOpen(false)}>
            <X size={16} />
          </button>
        </div>
        <div className="drawer-content">
          {savedSellers.length === 0 ? (
            <div className="drawer-empty-state">
              <Users size={48} />
              <h4>No Saved Suppliers Yet</h4>
              <p>Bookmark merchants from product cards or product details to build your IndiaMART B2B supply network.</p>
            </div>
          ) : (
            savedSellers.map(doc => {
              const seller = doc.seller || {};
              return (
                <div key={doc._id} className="supplier-card-item">
                  <div className="supplier-card-header">
                    <BusinessLogo name={seller.name || seller.companyName} image={seller.image} size="md" />
                    <div className="supplier-card-info">
                      <div className="supplier-name-row">
                        <h4 className="supplier-company-name">{seller.companyName || seller.name}</h4>
                        <span className="gstin-verified-chip"><ShieldCheck size={11} /> GST Verified</span>
                      </div>
                      <span className={`saved-supplier-pill ${doc.relationshipTag === 'Trusted Seller' ? 'trusted' : doc.relationshipTag === 'Our Seller' ? 'our-seller' : doc.relationshipTag === 'Seller You Buy From' ? 'buy-from' : ''}`}>
                        ⭐ {doc.relationshipTag || 'Saved Supplier'}
                      </span>
                      {(seller.city || seller.state) && (
                        <span className="supplier-location-text">
                          <MapPin size={11} /> {seller.city ? `${seller.city}, ${seller.state || ''}` : seller.state}
                        </span>
                      )}
                    </div>
                  </div>

                  {doc.customNotes && (
                    <div className="supplier-notes-box">
                      <div className="supplier-notes-title">Private Business Notes:</div>
                      <div>{doc.customNotes}</div>
                    </div>
                  )}

                  <div className="supplier-actions-row">
                    <button 
                      className="supplier-btn-sm supplier-btn-primary"
                      onClick={() => {
                        setIsSavedSellersOpen(false);
                        navigate(`/network`);
                      }}
                    >
                      <MessageSquare size={13} /> Chat / Message
                    </button>
                    <button 
                      className="supplier-btn-sm"
                      onClick={() => {
                        setSupplierFilterTag(doc.relationshipTag || 'My Suppliers');
                        setIsSavedSellersOpen(false);
                      }}
                    >
                      <ShoppingBag size={13} /> View Products ({seller.totalProducts || 0})
                    </button>
                    <button 
                      className="supplier-btn-sm"
                      onClick={() => {
                        setEditingNotesSeller(doc);
                        setEditTagInput(doc.relationshipTag || 'Trusted Seller');
                        setEditNotesInput(doc.customNotes || '');
                      }}
                    >
                      <Edit2 size={13} /> Edit Note / Tag
                    </button>
                    <button 
                      className="supplier-btn-sm"
                      style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                      onClick={(e) => handleRemoveSavedSeller(doc.sellerId, e)}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Cart Side Drawer */}
      <div className={`drawer-container ${isCartOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3><ShoppingCart size={20} /> Your Cart</h3>
          <button className="drawer-close-btn" onClick={() => setIsCartOpen(false)}>
            <X size={16} />
          </button>
        </div>
        <div className="drawer-content">
          {cartItems.length > 0 && (
            <div className="free-shipping-tracker">
              <div className="free-shipping-text">
                {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                  <span>🎉 Your order qualifies for <strong>FREE Shipping!</strong></span>
                ) : (
                  <span>Add <strong>₹{remainingForFreeShipping.toLocaleString()}</strong> more for <strong>FREE Shipping!</strong></span>
                )}
              </div>
              <div className="free-shipping-bar-bg">
                <div className="free-shipping-bar-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="drawer-empty-state">
              <ShoppingCart size={48} />
              <h4>Your Cart is empty</h4>
              <p>Add products from the marketplace to request bulk quotes.</p>
            </div>
          ) : (
            cartItems.map(item => {
              const prod = item.product || {};
              const pData = prod.data || {};
              const currentPrice = Number(pData.salePrice || pData.sellingPrice || pData.price || 0);
              return (
                <div key={item._id} className="drawer-item">
                  {pData.image ? (
                    <img src={pData.image} alt={pData.name} className="drawer-item-img" />
                  ) : (
                    <div className="drawer-item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShoppingBag size={24} style={{ color: '#cbd5e1' }} />
                    </div>
                  )}
                  <div className="drawer-item-details">
                    <h4 className="drawer-item-name">{pData.name || 'Product'}</h4>
                    <span className="drawer-item-seller">Seller: {prod.sellerName || 'GST Merchant'}</span>
                    <div className="drawer-item-actions">
                      <span className="drawer-item-price">₹{currentPrice.toLocaleString()}</span>
                      <div className="drawer-quantity-selector">
                        <button className="drawer-qty-btn" onClick={() => handleUpdateCartQty(item.productId, item.quantity, -1)}><Minus size={12} /></button>
                        <span className="drawer-qty-val">{item.quantity}</span>
                        <button className="drawer-qty-btn" onClick={() => handleUpdateCartQty(item.productId, item.quantity, 1)}><Plus size={12} /></button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                        <button className="drawer-save-later-btn" onClick={(e) => handleSaveForLater(item.productId, e)}>
                          Save for later
                        </button>
                        <button className="drawer-remove-btn" onClick={() => handleRemoveFromCart(item.productId)} title="Remove item">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {cartItems.length > 0 && (
          <div className="drawer-footer">
            {totalSavings > 0 && (
              <div className="drawer-savings-summary">
                <span>Total Savings:</span>
                <span>- ₹{totalSavings.toLocaleString()}</span>
              </div>
            )}
            <div className="drawer-total-row">
              <span className="drawer-total-label">Subtotal ({cartItems.reduce((acc, c) => acc + c.quantity, 0)} items)</span>
              <span className="drawer-total-price">
                ₹{subtotal.toLocaleString()}
              </span>
            </div>
            <div className="drawer-actions-grid">
              <button className="drawer-btn drawer-btn-secondary" onClick={handleClearCart}>Clear Cart</button>
              <button className="drawer-btn drawer-btn-primary" onClick={handleCheckout}>Request Quote</button>
            </div>
          </div>
        )}
      </div>

      {/* Wishlist Side Drawer */}
      <div className={`drawer-container ${isWishlistOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3><Heart size={20} fill="#ef4444" color="#ef4444" /> Your Wishlist</h3>
          <button className="drawer-close-btn" onClick={() => setIsWishlistOpen(false)}>
            <X size={16} />
          </button>
        </div>
        <div className="drawer-content">
          {wishlistItems.length === 0 ? (
            <div className="drawer-empty-state">
              <Heart size={48} />
              <h4>Your Wishlist is empty</h4>
              <p>Save products here to keep track of interesting B2B deals.</p>
            </div>
          ) : (
            wishlistItems.map(item => {
              const prod = item.product || {};
              const pData = prod.data || {};
              const currentPrice = Number(pData.salePrice || pData.sellingPrice || pData.price || 0);
              return (
                <div key={item._id} className="drawer-item" style={{ flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {pData.image ? (
                      <img src={pData.image} alt={pData.name} className="drawer-item-img" />
                    ) : (
                      <div className="drawer-item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={24} style={{ color: '#cbd5e1' }} />
                      </div>
                    )}
                    <div className="drawer-item-details">
                      <h4 className="drawer-item-name">{pData.name || 'Product'}</h4>
                      <span className="drawer-item-seller">Seller: {prod.sellerName || 'GST Merchant'}</span>
                      <div className="drawer-item-actions">
                        <span className="drawer-item-price">₹{currentPrice.toLocaleString()}</span>
                        <button className="drawer-remove-btn" onClick={(e) => handleToggleWishlist(item.productId, e)} title="Remove item">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button 
                    className="drawer-move-to-cart"
                    onClick={async (e) => {
                      await handleAddToCart(item.productId, 1, e);
                      await handleToggleWishlist(item.productId, e);
                    }}
                  >
                    <ShoppingCart size={14} /> Move to Cart
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Supplier Note / Tag Modal Dialog */}
      {editingNotesSeller && (
        <div className="supplier-modal-backdrop" onClick={() => setEditingNotesSeller(null)}>
          <div className="supplier-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="supplier-modal-header">
              <h4>Edit Supplier Notes & Relationship</h4>
              <button className="drawer-close-btn" onClick={() => setEditingNotesSeller(null)}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Select Relationship Badge:</label>
              <div className="tag-options-grid">
                {['Trusted Seller', 'Our Seller', 'Seller You Buy From', 'My Connection', 'Preferred Supplier'].map(tag => (
                  <button
                    key={tag}
                    className={`tag-option-btn ${editTagInput === tag ? 'active' : ''}`}
                    onClick={() => setEditTagInput(tag)}
                  >
                    ⭐ {tag}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Private Business Notes:</label>
              <textarea
                placeholder="e.g. Net-30 credit terms agreed. Contact Rahul for bulk order discounts..."
                value={editNotesInput}
                onChange={(e) => setEditNotesInput(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="drawer-btn drawer-btn-secondary" onClick={() => setEditingNotesSeller(null)}>
                Cancel
              </button>
              <button 
                className="drawer-btn drawer-btn-primary"
                onClick={() => {
                  handleSaveSeller(editingNotesSeller.sellerId, editTagInput, editNotesInput);
                  setEditingNotesSeller(null);
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flipkart & Amazon Style Bottom Navigation Bar */}
      <StoreBottomNav cartCount={cartItems.length} />
    </div>
  );
};

export default Store;

