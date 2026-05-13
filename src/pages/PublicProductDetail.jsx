import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
} from 'lucide-react';
import { useRef } from 'react';
import './PublicProductDetail.css';

const PublicProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [zoomStyle, setZoomStyle] = useState({ display: 'none' });
  const [lensStyle, setLensStyle] = useState({ display: 'none' });
  const [isZooming, setIsZooming] = useState(false);

  const mainImgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/public/product/${id}`);

        if (response.ok) {
          const data = await response.json();
          setProduct(data.product);
          setSeller(data.seller);
        }
      } catch (error) {
        console.error('Error loading product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

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

  const handleMouseMove = (e) => {
    if (!mainImgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const img = mainImgRef.current;
    const bounds = container.getBoundingClientRect();
    
    const lensWidth = 120;
    const lensHeight = 120;

    let x = e.pageX - bounds.left - window.scrollX - lensWidth / 2;
    let y = e.pageY - bounds.top - window.scrollY - lensHeight / 2;

    x = Math.max(0, Math.min(x, bounds.width - lensWidth));
    y = Math.max(0, Math.min(y, bounds.height - lensHeight));

    setLensStyle({
      display: 'block',
      left: `${x}px`,
      top: `${y}px`
    });

    const resultWidth = 500;
    const resultHeight = 500;
    
    // Use the actual image rendered width/height for ratio
    const cx = resultWidth / lensWidth;
    const cy = resultHeight / lensHeight;

    setZoomStyle({
      display: 'block',
      backgroundImage: `url(${images[selectedImage]})`,
      backgroundSize: `${bounds.width * cx}px ${bounds.height * cy}px`,
      backgroundPosition: `-${x * cx}px -${y * cy}px`
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

  return (
    <div className="amazon-pdp-container">
      <div className="amazon-pdp">
        {/* Breadcrumb */}
        <div className="pdp-breadcrumbs">
          <span onClick={() => navigate('/hub')}>Network Hub</span>
          <span>/</span>
          <span onClick={() => navigate(`/p/${product.userId}`)}>{seller?.companyName || 'Seller'} Store</span>
          <span>/</span>
          <span className="active">{p.name}</span>
        </div>

        <div className="pdp-layout">
          {/* LEFT IMAGE SECTION */}
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
              </div>
            </div>
          </div>

          {/* CENTER CONTENT AREA (Contains both Info and Zoom Result) */}
          <div className="pdp-center-area">
            {/* ZOOM PANEL - Now sibling to info section */}
            <div className="pdp-zoom-result" style={zoomStyle}></div>

            {/* INFO SECTION - Hidden when zooming */}
            <div className={`pdp-info-section ${isZooming ? 'hidden' : ''}`}>
          <div className="brand-line">
            Visit the <span onClick={() => navigate(`/p/${product.userId}`)} style={{ cursor: 'pointer', color: '#007185' }}>{seller?.companyName || 'Premium'} Store</span>
          </div>

          <h1 className="pdp-title">{p.name}</h1>

          <div className="pdp-rating-row">
            <div className="stars">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={16} fill="#f59e0b" color="#f59e0b" />
              ))}
            </div>

            <span className="rating-count">4.5</span>
            <span className="reviews-link">1,240 ratings</span>
          </div>

          <hr />

          {/* PRICE */}
          <div className="price-section">
            {discount > 0 && (
              <div className="discount-badge">-{discount}%</div>
            )}

            <div className="main-price">
              <span className="rupee">₹</span>
              {currentPrice.toLocaleString()}
            </div>
          </div>

          {mrp > currentPrice && (
            <div className="mrp-line">
              M.R.P.: <span>₹{mrp.toLocaleString()}</span>
            </div>
          )}

          <div className="tax-text">
            Inclusive of all taxes
          </div>

          <div className="offer-strip">
            <div className="offer-card">
              <ShieldCheck size={20} color="#007185" />
              <div>
                <strong>Secure Payment</strong>
                <p>100% protected checkout</p>
              </div>
            </div>

            <div className="offer-card">
              <Truck size={20} color="#007185" />
              <div>
                <strong>Fast Delivery</strong>
                <p>Free shipping available</p>
              </div>
            </div>

            <div className="offer-card">
              <RotateCcw size={20} color="#007185" />
              <div>
                <strong>Easy Returns</strong>
                <p>7 day replacement</p>
              </div>
            </div>
          </div>

          <hr />

          {/* ABOUT */}
          <div className="about-section">
            <h3>About this item</h3>

            {bulletPoints.length > 0 ? (
              <ul>
                {bulletPoints.map((point, index) => (
                  <li key={index}>{point.trim()}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-desc">
                No product description available.
              </p>
            )}
          </div>


          {/* SPECIFICATIONS */}
          <div className="specifications-section">
            <h3>Product information</h3>

            <div className="spec-grid">
              <div className="spec-row">
                <span>Brand</span>
                <strong>{seller?.companyName || 'Generic'}</strong>
              </div>

              <div className="spec-row">
                <span>Category</span>
                <strong>{p.productGroup || 'General'}</strong>
              </div>

              <div className="spec-row">
                <span>HSN</span>
                <strong>{p.hsn || 'N/A'}</strong>
              </div>

              <div className="spec-row">
                <span>Unit</span>
                <strong>{p.unit || 'PCS'}</strong>
              </div>

              <div className="spec-row">
                <span>Tax Rate</span>
                <strong>{p.taxRate || 0}% GST</strong>
              </div>

              <div className="spec-row">
                <span>Stock Status</span>
                <strong style={{ color: p.stock > 0 ? '#007600' : '#cc0c39' }}>
                  {p.stock > 0 ? `In Stock (${p.stock})` : 'Out of Stock'}
                </strong>
              </div>

              {p.batch && (
                <div className="spec-row">
                  <span>Batch</span>
                  <strong>{p.batch}</strong>
                </div>
              )}

              {p.expiry && (
                <div className="spec-row">
                  <span>Expiry</span>
                  <strong>{p.expiry}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


        {/* RIGHT BUY BOX */}
        <div className="buybox-section">
          <div className="buybox-card">
            <div className="buybox-price">
              <span className="symbol">₹</span>
              <span className="amount">{currentPrice.toLocaleString()}</span>
            </div>

            <div className="buybox-delivery">
              FREE delivery <strong>{formattedDelivery}</strong>. Order within <span className="green-text">12 hrs 45 mins</span>
            </div>

            <div className="buybox-location">
              <MapPin size={15} />
              <span>Deliver to Bhopal 462001</span>
            </div>

            <div className="stock-status">
              {p.stock > 0 ? 'In Stock' : 'Currently Unavailable'}
            </div>

            {p.stock > 0 && (
              <div className="quantity-row">
                <span>Quantity:</span>
                <select value={quantity} onChange={(e) => setQuantity(e.target.value)}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="seller-box">
              <div className="seller-row">
                <span>Sold by</span>
                <strong>{seller?.companyName || 'Professional Seller'}</strong>
              </div>

              <div className="seller-row">
                <span>Payment</span>
                <strong>Secure transaction</strong>
              </div>
            </div>

            <div className="buy-actions">
              <button className="cart-btn">
                <ShoppingCart size={18} />
                Add to Cart
              </button>

              <button className="buy-btn">
                <Zap size={18} />
                Buy Now
              </button>
            </div>

            <button className="wishlist-btn">
              <Heart size={16} /> Add to Wishlist
            </button>

            <button className="share-btn">
              <Share2 size={16} /> Share Product
            </button>

            <div className="guarantee-box">
              <BadgeCheck size={18} />
              100% Authentic Product Guarantee
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProductDetail;