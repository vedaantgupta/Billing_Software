import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, 
  Users, 
  Heart, 
  ShoppingCart, 
  ShieldCheck, 
  Building2, 
  MapPin, 
  Edit2, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  MessageSquare, 
  ExternalLink,
  X,
  Bookmark,
  CheckCircle2,
  Package,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import StoreNavbar from '@/features/store/components/StoreNavbar';
import StoreBottomNav from '@/features/store/components/StoreBottomNav';
import '@/features/store/styles/AccountPage.css';

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

export default function AccountPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'profile';

  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [savedSellers, setSavedSellers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Edit Supplier Note Modal State
  const [editingNotesSeller, setEditingNotesSeller] = useState(null);
  const [editTagInput, setEditTagInput] = useState('Trusted Seller');
  const [editNotesInput, setEditNotesInput] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchCart(),
      fetchWishlist(),
      fetchSavedSellers()
    ]);
    setIsLoading(false);
  };

  const showToast = (message, type = 'success', product = null) => {
    setToast({ message, type, product });
    setTimeout(() => setToast(null), 4000);
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

  const handleSaveSeller = async (sellerId, relationshipTag = 'Trusted Seller', customNotes = '') => {
    if (!user?.id) return;
    try {
      const response = await fetch('http://localhost:5000/api/marketplace/saved-sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, sellerId, relationshipTag, customNotes })
      });
      if (response.ok) {
        showToast(`Saved supplier as "${relationshipTag}"`, 'success');
        fetchSavedSellers();
      } else {
        const err = await response.json();
        showToast(err.message || 'Failed to update supplier', 'error');
      }
    } catch (err) {
      console.error('Error saving supplier:', err);
    }
  };

  const handleRemoveSavedSeller = async (sellerId) => {
    if (!user?.id) return;
    try {
      const response = await fetch(`http://localhost:5000/api/marketplace/saved-sellers?userId=${user.id}&sellerId=${sellerId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast('Supplier removed from saved list', 'info');
        fetchSavedSellers();
      }
    } catch (err) {
      console.error('Error removing saved seller:', err);
    }
  };

  const handleUpdateCartQty = async (productId, currentQty, delta) => {
    const newQty = currentQty + delta;
    if (!user?.id || newQty < 1) return;
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

  const handleToggleWishlist = async (productId) => {
    if (!user?.id) return;
    try {
      const response = await fetch(`http://localhost:5000/api/marketplace/wishlist?userId=${user.id}&productId=${productId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast('Item removed from wishlist', 'info');
        fetchWishlist();
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
    }
  };

  const handleMoveWishlistToCart = async (productId) => {
    if (!user?.id) return;
    try {
      const response = await fetch('http://localhost:5000/api/marketplace/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId, quantity: 1 })
      });
      if (response.ok) {
        await fetch(`http://localhost:5000/api/marketplace/wishlist?userId=${user.id}&productId=${productId}`, {
          method: 'DELETE'
        });
        showToast('Moved to cart!', 'success');
        fetchCart();
        fetchWishlist();
      }
    } catch (err) {
      console.error('Error moving to cart:', err);
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

  const handleCheckout = () => {
    showToast('Submitting bulk quote requests to sellers...', 'info');
    setTimeout(async () => {
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
      showToast('B2B Quotes requested! Sellers added to "Sellers You Buy From"', 'success');
    }, 1200);
  };

  // Calculations for cart
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

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  return (
    <div className="account-page-container">
      {/* Top Marketplace Navigation Bar */}
      <StoreNavbar 
        cartCount={cartItems.length}
        wishlistCount={wishlistItems.length}
        suppliersCount={savedSellers.length}
      />

      {/* Account Hero Banner */}
      <div className="account-hero-banner glass">
        <div className="account-hero-profile">
          <BusinessLogo 
            name={user?.firstName ? `${user.firstName} ${user.lastName}` : (user?.username || 'User')} 
            image={user?.professionalProfile?.profilePicture}
            size="lg"
            className="account-avatar"
          />
          <div className="account-user-meta">
            <h2>{user?.firstName ? `${user.firstName} ${user.lastName}` : (user?.username || 'Marketplace Member')}</h2>
            <p className="account-email-text">{user?.email || 'B2B Wholesale Buyer & Merchant'}</p>
            <div className="account-badges-row">
              <span className="account-status-chip">
                <ShieldCheck size={13} color="#10b981" /> Verified Account
              </span>
              <button 
                className="view-public-profile-link" 
                onClick={() => navigate(`/p/${user?.id}`)}
              >
                <ExternalLink size={12} /> View Public Seller Profile
              </button>
            </div>
          </div>
        </div>

        {/* Amazon & Flipkart Style Account Navigation Tiles */}
        <div className="account-tiles-grid">
          <div 
            className={`account-tile-card ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabChange('profile')}
          >
            <div className="tile-icon-box tile-blue">
              <User size={22} />
            </div>
            <div className="tile-text">
              <span className="tile-title">Your Profile</span>
              <span className="tile-desc">Business details & settings</span>
            </div>
          </div>

          <div 
            className={`account-tile-card ${activeTab === 'suppliers' ? 'active' : ''}`}
            onClick={() => handleTabChange('suppliers')}
          >
            <div className="tile-icon-box tile-purple">
              <Users size={22} />
            </div>
            <div className="tile-text">
              <span className="tile-title">My Suppliers</span>
              <span className="tile-desc">{savedSellers.length} IndiaMART network sellers</span>
            </div>
          </div>

          <div 
            className={`account-tile-card ${activeTab === 'wishlist' ? 'active' : ''}`}
            onClick={() => handleTabChange('wishlist')}
          >
            <div className="tile-icon-box tile-red">
              <Heart size={22} />
            </div>
            <div className="tile-text">
              <span className="tile-title">Wishlist</span>
              <span className="tile-desc">{wishlistItems.length} saved products</span>
            </div>
          </div>

          <div 
            className={`account-tile-card ${activeTab === 'cart' ? 'active' : ''}`}
            onClick={() => handleTabChange('cart')}
          >
            <div className="tile-icon-box tile-green">
              <ShoppingCart size={22} />
            </div>
            <div className="tile-text">
              <span className="tile-title">Cart & Quotes</span>
              <span className="tile-desc">{cartItems.length} items for bulk quote</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Content Section */}
      <div className="account-main-content">
        
        {/* 1. YOUR PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="account-section-card glass animate-fade">
            <div className="section-header-row">
              <div className="section-header-left">
                <User size={24} className="section-header-icon color-blue" />
                <div>
                  <h3>Your Profile & Business Settings</h3>
                  <p>Manage your account identity, contact information, and store options.</p>
                </div>
              </div>
              <button className="btn btn-outline" onClick={() => navigate('/settings')}>
                <Edit2 size={15} /> Edit Settings
              </button>
            </div>

            <div className="profile-details-grid">
              <div className="profile-info-tile">
                <span className="info-label">Full Name</span>
                <span className="info-value">{user?.firstName ? `${user.firstName} ${user.lastName}` : 'Not provided'}</span>
              </div>
              <div className="profile-info-tile">
                <span className="info-label">Email Address</span>
                <span className="info-value">{user?.email || 'N/A'}</span>
              </div>
              <div className="profile-info-tile">
                <span className="info-label">Phone Number</span>
                <span className="info-value">{user?.phone || 'Add phone number'}</span>
              </div>
              <div className="profile-info-tile">
                <span className="info-label">User Role / Account Type</span>
                <span className="info-value text-capitalize">{user?.role || 'Merchant & Buyer'}</span>
              </div>
              <div className="profile-info-tile">
                <span className="info-label">Public Seller URL</span>
                <span className="info-value highlight-link" onClick={() => navigate(`/p/${user?.id}`)}>
                  /p/{user?.id} <ExternalLink size={13} />
                </span>
              </div>
            </div>

            <div className="profile-quick-actions-bar">
              <h4>Quick Account Actions</h4>
              <div className="quick-actions-flex">
                <button className="btn btn-secondary" onClick={() => navigate('/settings')}>
                  Security & Password
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/products')}>
                  Manage My Products
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/network')}>
                  Open B2B Network Hub
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. MY SUPPLIERS TAB */}
        {activeTab === 'suppliers' && (
          <div className="account-section-card glass animate-fade">
            <div className="section-header-row">
              <div className="section-header-left">
                <Users size={24} className="section-header-icon color-purple" />
                <div>
                  <h3>My Suppliers ({savedSellers.length})</h3>
                  <p>IndiaMART B2B Network: Saved trusted merchants, suppliers you buy from, and custom relationship tags.</p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => navigate('/store')}>
                <ShoppingBag size={15} /> Discover Suppliers in Store
              </button>
            </div>

            {savedSellers.length === 0 ? (
              <div className="account-empty-state">
                <Users size={56} className="empty-icon color-purple" />
                <h4>No Saved Suppliers Yet</h4>
                <p>Bookmark sellers while browsing the store or requesting bulk quotes to build your wholesale network.</p>
                <button className="btn btn-primary mt-3" onClick={() => navigate('/store')}>
                  Browse Store Products
                </button>
              </div>
            ) : (
              <div className="suppliers-cards-grid">
                {savedSellers.map(doc => {
                  const seller = doc.seller || {};
                  return (
                    <div key={doc._id} className="supplier-hub-card">
                      <div className="supplier-card-top">
                        <BusinessLogo name={seller.name || seller.companyName} image={seller.image} size="md" />
                        <div className="supplier-meta-col">
                          <div className="supplier-title-row">
                            <h4>{seller.companyName || seller.name || 'GST Merchant'}</h4>
                            <span className="gstin-verified-chip"><ShieldCheck size={11} /> GST Verified</span>
                          </div>
                          <span className={`saved-supplier-pill ${doc.relationshipTag === 'Trusted Seller' ? 'trusted' : doc.relationshipTag === 'Our Seller' ? 'our-seller' : doc.relationshipTag === 'Seller You Buy From' ? 'buy-from' : ''}`}>
                            ⭐ {doc.relationshipTag || 'Saved Supplier'}
                          </span>
                          {(seller.city || seller.state) && (
                            <span className="supplier-location-text">
                              <MapPin size={12} /> {seller.city ? `${seller.city}, ${seller.state || ''}` : seller.state}
                            </span>
                          )}
                        </div>
                      </div>

                      {doc.customNotes && (
                        <div className="supplier-notes-box">
                          <div className="notes-heading">Private Business Notes:</div>
                          <p>{doc.customNotes}</p>
                        </div>
                      )}

                      <div className="supplier-card-actions">
                        <button 
                          className="btn btn-sm btn-outline"
                          onClick={() => navigate(`/network`)}
                        >
                          <MessageSquare size={13} /> Chat / Message
                        </button>
                        <button 
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            setEditingNotesSeller(doc);
                            setEditTagInput(doc.relationshipTag || 'Trusted Seller');
                            setEditNotesInput(doc.customNotes || '');
                          }}
                        >
                          <Edit2 size={13} /> Edit Note / Tag
                        </button>
                        <button 
                          className="btn btn-sm btn-danger-outline"
                          onClick={() => handleRemoveSavedSeller(doc.sellerId)}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. WISHLIST TAB */}
        {activeTab === 'wishlist' && (
          <div className="account-section-card glass animate-fade">
            <div className="section-header-row">
              <div className="section-header-left">
                <Heart size={24} className="section-header-icon color-red" />
                <div>
                  <h3>Your Wishlist ({wishlistItems.length})</h3>
                  <p>Saved products & items for future bulk orders or wholesale evaluation.</p>
                </div>
              </div>
            </div>

            {wishlistItems.length === 0 ? (
              <div className="account-empty-state">
                <Heart size={56} className="empty-icon color-red" />
                <h4>Your Wishlist is Empty</h4>
                <p>Click the heart icon on any product in the marketplace to save it here for later.</p>
                <button className="btn btn-primary mt-3" onClick={() => navigate('/store')}>
                  Explore Marketplace
                </button>
              </div>
            ) : (
              <div className="wishlist-products-grid">
                {wishlistItems.map(item => {
                  const prod = item.product || {};
                  const pData = prod.data || {};
                  const currentPrice = Number(pData.salePrice || pData.sellingPrice || pData.price || 0);

                  return (
                    <div key={item._id} className="wishlist-item-card">
                      <div className="wishlist-img-box">
                        {pData.image ? (
                          <img src={pData.image} alt={pData.name} />
                        ) : (
                          <ShoppingBag size={40} color="#cbd5e1" />
                        )}
                        <button 
                          className="remove-wishlist-btn"
                          onClick={() => handleToggleWishlist(item.productId)}
                          title="Remove from wishlist"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="wishlist-details-box">
                        <span className="wishlist-category">{pData.productGroup || 'General'}</span>
                        <h4 className="wishlist-item-name">{pData.name || 'Product'}</h4>
                        <span className="wishlist-seller-name">Seller: {prod.sellerName || 'GST Merchant'}</span>
                        <div className="wishlist-price-row">
                          <span className="wishlist-price">₹{currentPrice.toLocaleString()}</span>
                        </div>
                        <button 
                          className="btn btn-primary move-cart-btn"
                          onClick={() => handleMoveWishlistToCart(item.productId)}
                        >
                          <ShoppingCart size={15} /> Move to Cart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. CART & BULK QUOTES TAB */}
        {activeTab === 'cart' && (
          <div className="account-section-card glass animate-fade">
            <div className="section-header-row">
              <div className="section-header-left">
                <ShoppingCart size={24} className="section-header-icon color-green" />
                <div>
                  <h3>Cart & Bulk Quotes ({cartItems.length})</h3>
                  <p>Review items, adjust quantities, and send bulk quote requests directly to suppliers.</p>
                </div>
              </div>
              {cartItems.length > 0 && (
                <button className="btn btn-outline-danger" onClick={handleClearCart}>
                  Clear Cart
                </button>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="free-shipping-banner">
                <div className="free-shipping-text">
                  {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                    <span>🎉 Your order qualifies for <strong>FREE Wholesale Shipping!</strong></span>
                  ) : (
                    <span>Add <strong>₹{remainingForFreeShipping.toLocaleString()}</strong> more for <strong>FREE Wholesale Shipping!</strong></span>
                  )}
                </div>
                <div className="free-shipping-bar-bg">
                  <div className="free-shipping-bar-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            )}

            {cartItems.length === 0 ? (
              <div className="account-empty-state">
                <ShoppingCart size={56} className="empty-icon color-green" />
                <h4>Your Cart is Empty</h4>
                <p>Browse products in the marketplace and add items to your cart to request bulk quotes.</p>
                <button className="btn btn-primary mt-3" onClick={() => navigate('/store')}>
                  Go to Marketplace Store
                </button>
              </div>
            ) : (
              <div className="cart-layout-grid">
                <div className="cart-items-column">
                  {cartItems.map(item => {
                    const prod = item.product || {};
                    const pData = prod.data || {};
                    const currentPrice = Number(pData.salePrice || pData.sellingPrice || pData.price || 0);

                    return (
                      <div key={item._id} className="cart-item-row">
                        <div className="cart-item-img-box">
                          {pData.image ? (
                            <img src={pData.image} alt={pData.name} />
                          ) : (
                            <ShoppingBag size={32} color="#cbd5e1" />
                          )}
                        </div>
                        <div className="cart-item-info">
                          <h4 className="cart-item-title">{pData.name || 'Product'}</h4>
                          <span className="cart-item-merchant">Seller: {prod.sellerName || 'GST Merchant'}</span>
                          <span className="cart-item-unit-price">₹{currentPrice.toLocaleString()} / unit</span>
                        </div>
                        <div className="cart-item-controls">
                          <div className="cart-qty-picker">
                            <button onClick={() => handleUpdateCartQty(item.productId, item.quantity, -1)}><Minus size={13} /></button>
                            <span>{item.quantity}</span>
                            <button onClick={() => handleUpdateCartQty(item.productId, item.quantity, 1)}><Plus size={13} /></button>
                          </div>
                          <span className="cart-item-total">₹{(currentPrice * item.quantity).toLocaleString()}</span>
                          <button 
                            className="cart-remove-icon-btn" 
                            onClick={() => handleRemoveFromCart(item.productId)} 
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cart Order Summary */}
                <div className="cart-summary-card glass">
                  <h4>Order Quote Summary</h4>
                  <div className="summary-row">
                    <span>Total Items:</span>
                    <span>{cartItems.reduce((acc, c) => acc + c.quantity, 0)} units</span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="summary-row text-green">
                      <span>Total Savings:</span>
                      <span>- ₹{totalSavings.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="summary-divider" />
                  <div className="summary-row subtotal-row">
                    <span>Estimated Subtotal:</span>
                    <span className="subtotal-val">₹{subtotal.toLocaleString()}</span>
                  </div>

                  <button className="btn btn-primary checkout-btn" onClick={handleCheckout}>
                    Request Bulk Quotes <ArrowRight size={16} />
                  </button>
                  <p className="checkout-disclaimer">
                    <ShieldCheck size={13} color="#10b981" style={{ display: 'inline', marginRight: '4px' }} />
                    Sellers will be automatically connected to your "Suppliers You Buy From" network.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Supplier Notes Modal */}
      {editingNotesSeller && (
        <div className="supplier-modal-backdrop" onClick={() => setEditingNotesSeller(null)}>
          <div className="supplier-modal-content glass" onClick={(e) => e.stopPropagation()}>
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
              <button className="btn btn-secondary" onClick={() => setEditingNotesSeller(null)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary"
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

      {/* Toast Notification */}
      {toast && (
        <div className="premium-toast">
          <div className="toast-content-wrapper">
            <h5 className="toast-title">
              {toast.type === 'error' ? '❌ Error' : toast.type === 'info' ? 'ℹ️ Notice' : '🎉 Action Complete'}
            </h5>
            <p className="toast-desc">{toast.message}</p>
          </div>
          <button className="toast-close-btn" onClick={() => setToast(null)}>✕</button>
        </div>
      )}
      {/* Flipkart & Amazon Style Bottom Navigation Bar */}
      <StoreBottomNav cartCount={cartItems.length} />
    </div>
  );
}
