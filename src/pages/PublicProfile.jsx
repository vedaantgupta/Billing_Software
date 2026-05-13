import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MapPin, Mail, Phone, ExternalLink, Package, MessageSquare, BookOpen, Briefcase, Award, CheckCircle, ShoppingBag, Star, Share2, Globe, MessageCircle, Heart, History, Clock, Truck, RotateCcw, Zap, Users, Info, ShieldCheck, TrendingUp, HelpCircle, Tag } from 'lucide-react';
import './PublicProfile.css';

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });
  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState([]); // Shoppable Feed posts
  const [showContactInfo, setShowContactInfo] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/public/profile/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
        } else {
          setError('Profile not found');
        }
      } catch (err) {
        setError('Error loading profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
    fetchReviews();
    fetchFeed();
  }, [id]);

  const fetchFeed = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/network/feed`);
      if (response.ok) {
        const data = await response.json();
        // Filter posts by this user and mock product tags
        const userPosts = data.filter(p => p.authorId === id).map(p => ({
          ...p,
          taggedProducts: [{ id: 'mock', name: 'Premium Service' }]
        }));
        setPosts(userPosts);
      }
    } catch (err) {
      console.error("Error fetching feed", err);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/reviews/${id}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (err) {
      console.error("Error fetching reviews", err);
    }
  };

  const handlePostReview = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: id,
          reviewerId: 'guest', // In real app, use logged in user id
          reviewerName: 'Verified Client',
          rating: newReview.rating,
          text: newReview.text
        })
      });
      if (response.ok) {
        setShowReviewModal(false);
        setNewReview({ rating: 5, text: '' });
        fetchReviews();
      }
    } catch (err) {
      alert("Error posting review");
    }
  };

  if (isLoading) return <div className="profile-loading">Loading public profile...</div>;
  if (!profileData || !profileData.user) return <div className="profile-error">Profile not found.</div>;

  const { user, products } = profileData;
  const displayName = user.firstName ? `${user.firstName} ${user.lastName}` : user.username;
  const profProfile = user.professionalProfile || {};

  return (
    <div className="public-profile-container">
      {/* Hero Banner Section */}
      <div className="profile-hero-banner" style={{ 
        backgroundImage: profProfile.bannerImage ? `url(${profProfile.bannerImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        {!profProfile.bannerImage && <div className="hero-gradient"></div>}
      </div>

      <div className="profile-info-card">
        <div className="info-card-top-row">
          <div className="avatar-container">
            <img 
              src={profProfile.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff&size=256`} 
              alt={displayName} 
              className="profile-avatar"
            />
          </div>
          <div className="engagement-stats">
            <div className="stat-item">
              <span className="stat-value">1.2k+</span>
              <span className="stat-label">Happy Clients</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value">~15m</span>
              <span className="stat-label">Avg. Response</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value">4.9/5</span>
              <span className="stat-label">Top Rated</span>
            </div>
          </div>
        </div>
        
        <div className="profile-details-section">
          <div className="details-and-badge-row">
            <div className="title-group">
              <h1>{displayName}</h1>
              <p className="profile-tagline">{profProfile.valueProposition || 'Premium Business Excellence'}</p>
              <div className="profile-sub-info">
                <span className="location-text">
                  {user.city && `${user.city}, `}{user.state || user.country || 'India'}
                </span>
                <button className="contact-info-link" onClick={() => setShowContactInfo(true)}>
                  Contact info
                </button>
              </div>
            </div>
            
            <div className="verification-badge-container">
              {reviews.filter(r => r.rating === 5).length >= 17 ? (
                <div className="badge-wrapper green-badge" title="17+ 5-Star Reviews">
                  <div className="badge-svg-container">
                     {/* Green rosette with check */}
                     <svg viewBox="0 0 24 24" fill="#22c55e" xmlns="http://www.w3.org/2000/svg">
                       <path d="M12 2L14.8 4.2L18.2 3.8L19.4 7L22.4 8.6L21.2 12L22.4 15.4L19.4 17L18.2 20.2L14.8 19.8L12 22L9.2 19.8L5.8 20.2L4.6 17L1.6 15.4L2.8 12L1.6 8.6L4.6 7L5.8 3.8L9.2 4.2L12 2Z" />
                       <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                     </svg>
                  </div>
                </div>
              ) : reviews.filter(r => r.rating === 5).length >= 10 ? (
                <div className="badge-wrapper blue-badge" title="10+ 5-Star Reviews">
                  <div className="badge-svg-container">
                     {/* Blue rosette with check */}
                     <svg viewBox="0 0 24 24" fill="#3b82f6" xmlns="http://www.w3.org/2000/svg">
                       <path d="M12 2L14.8 4.2L18.2 3.8L19.4 7L22.4 8.6L21.2 12L22.4 15.4L19.4 17L18.2 20.2L14.8 19.8L12 22L9.2 19.8L5.8 20.2L4.6 17L1.6 15.4L2.8 12L1.6 8.6L4.6 7L5.8 3.8L9.2 4.2L12 2Z" />
                       <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                     </svg>
                  </div>
                </div>
              ) : reviews.filter(r => r.rating === 5).length >= 5 ? (
                <div className="badge-wrapper shield-badge" title="5+ 5-Star Reviews">
                  <div className="badge-svg-container">
                     {/* Shield with check */}
                     <ShieldCheck size={64} fill="#0ea5e9" color="white" strokeWidth={1} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {profProfile.missionStatement && (
            <div className="mission-text">
              <p>"{profProfile.missionStatement}"</p>
            </div>
          )}

          <div className="profile-actions">
            <button className="btn btn-primary btn-cta"><MessageSquare size={18} /> Direct Consultation</button>
            {profProfile.whatsapp && (
              <a href={`https://wa.me/${profProfile.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary whatsapp-btn" style={{ background: '#25D366', color: 'white' }}>
                <MessageCircle size={18} /> WhatsApp
              </a>
            )}
            {profProfile.supportLink && (
              <a href={profProfile.supportLink} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: '600' }}>
                <HelpCircle size={18} /> Support Desk
              </a>
            )}
            <button className="btn btn-outline share-btn" onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Profile link copied!");
            }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: '600' }}><Share2 size={18} /> Share</button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="profile-tabs-nav glass">
        <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
          <BookOpen size={18} /> Profile
        </button>
        <button className={activeTab === 'shop' ? 'active' : ''} onClick={() => setActiveTab('shop')}>
          <ShoppingBag size={18} /> Showroom
        </button>
        <button className={activeTab === 'posts' ? 'active' : ''} onClick={() => setActiveTab('posts')}>
          <MessageSquare size={18} /> Posts
        </button>
        <button className={activeTab === 'reviews' ? 'active' : ''} onClick={() => setActiveTab('reviews')}>
          <Star size={18} /> Client Proof ({reviews.length})
        </button>
      </div>

      <div className="profile-content-grid">
        {/* Main Content Column */}
        <div className="profile-main-col">

          {activeTab === 'profile' && (
            <>
              {/* About Section */}
              {profProfile.about && (
                <div className="profile-section glass">
                  <h2 className="section-title"><BookOpen size={22} /> The Story of {displayName}</h2>
                  <p className="about-text">{profProfile.about}</p>
                </div>
              )}

              {/* Skills Section */}
              {profProfile.skills && profProfile.skills.length > 0 && (
                <div className="profile-section glass">
                  <h2 className="section-title"><Award size={22} /> Top Skills & Expertise</h2>
                  <div className="skills-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginTop: '1rem' }}>
                    {profProfile.skills.map((skill, i) => (
                      <span key={i} className="skill-tag" style={{ padding: '0.6rem 1.2rem', background: 'var(--primary-light)', color: 'white', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {skill} <CheckCircle size={14} color="white" />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Operations & Policies Section */}
              <div className="profile-section glass">
                <h2 className="section-title"><Clock size={22} /> Operations & Policies</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ background: '#f1f5f9', padding: '0.8rem', borderRadius: '12px' }}><Clock size={24} color="var(--primary-color)" /></div>
                    <div>
                      <h4 style={{ margin: '0 0 0.2rem 0', color: 'var(--text-main)' }}>Business Hours</h4>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{profProfile.businessHours || 'Open: 9 AM - 6 PM'}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ background: '#f1f5f9', padding: '0.8rem', borderRadius: '12px' }}><Truck size={24} color="var(--primary-color)" /></div>
                    <div>
                      <h4 style={{ margin: '0 0 0.2rem 0', color: 'var(--text-main)' }}>Shipping Policy</h4>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{profProfile.shippingPolicy || 'Fast Shipping Available'}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ background: '#f1f5f9', padding: '0.8rem', borderRadius: '12px' }}><RotateCcw size={24} color="var(--primary-color)" /></div>
                    <div>
                      <h4 style={{ margin: '0 0 0.2rem 0', color: 'var(--text-main)' }}>Return Policy</h4>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{profProfile.returnPolicy || '7-Day Return Policy'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Awards & Certifications */}
              {(profProfile.awards?.length > 0 || profProfile.certifications?.length > 0) && (
                <div className="profile-section glass">
                  <h2 className="section-title"><Award size={22} /> Credentials & Recognition</h2>
                  <div className="credentials-grid">
                    {profProfile.awards?.map((award, i) => (
                      <div key={i} className="credential-item award">
                        <Award className="cred-icon" />
                        <span>{award}</span>
                      </div>
                    ))}
                    {profProfile.certifications?.map((cert, i) => (
                      <div key={i} className="credential-item cert">
                        <CheckCircle className="cred-icon" />
                        <span>{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience Section */}
              {profProfile.experience && profProfile.experience.length > 0 && (
                <div className="profile-section glass">
                  <h2 className="section-title"><Briefcase size={22} /> Career Milestones</h2>
                  <div className="experience-list">
                    {profProfile.experience.map(exp => (
                      <div key={exp.id} className="experience-item">
                        <div className="exp-icon">
                          <TrendingUp size={24} color="var(--primary-color)" />
                        </div>
                        <div className="exp-details">
                          <h3>{exp.title}</h3>
                          <h4>{exp.company}</h4>
                          <span className="exp-duration">{exp.duration}</span>
                          <p className="exp-desc">{exp.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'posts' && (
            <div className="profile-section posts-section glass">
              <h2 className="section-title"><MessageSquare size={22} /> Updates & Insights</h2>
              <div className="posts-list">
                {posts.length === 0 ? (
                  <div className="empty-posts">
                    <p>No posts shared by this professional yet.</p>
                  </div>
                ) : (
                  posts.map(post => (
                    <div key={post._id} className="post-card-simple glass">
                      <div className="post-header-simple">
                         <div className="post-author-avatar">
                            <img src={profProfile.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`} alt={displayName} />
                         </div>
                         <div className="post-meta-simple">
                            <strong>{displayName}</strong>
                            <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                         </div>
                      </div>
                      <div className="post-content-simple">
                        <p>{post.content}</p>
                      </div>
                      <div className="post-actions-simple">
                         <button className="action-item"><Heart size={18} /> Like</button>
                         <button className="action-item"><MessageSquare size={18} /> Comment</button>
                         <button className="action-item"><Share2 size={18} /> Share</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'shop' && (
            <div className="profile-section profile-marketplace glass">
              <div className="section-header">
                <h2><Package size={24} color="var(--primary-color)" /> Showroom</h2>
                <span>{products.length} Products Available</span>
              </div>

              {products.length === 0 ? (
                <div className="empty-catalog glass">
                  <p>This user hasn't listed any products yet.</p>
                </div>
              ) : (
                <div className="products-grid">
                  {products.map(item => {
                    const p = item.data;
                    return (
                      <div
                        key={item._id || item.id}
                        className="product-card"
                        onClick={() => navigate(`/product/${p.urlSlug || item._dbId || item._id || item.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="product-image-placeholder">
                          {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={48} color="#cbd5e1" />}
                          <button className="wishlist-btn" title="Add to Wishlist" onClick={(e) => { e.stopPropagation(); alert('Saved to wishlist!'); }}>
                            <Heart size={18} />
                          </button>
                        </div>
                        <div className="product-info">
                          <h3>{p.name}</h3>
                          <p className="product-price">₹{Number(p.salePrice || p.price || 0).toLocaleString()}</p>
                          <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '1rem' }} onClick={(e) => { e.stopPropagation(); alert('Purchase feature coming soon!'); }}>
                            Buy Now
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="profile-section glass">
              <div className="section-header" style={{ marginBottom: '2rem' }}>
                <h2><Star size={24} color="#f59e0b" fill="#f59e0b" /> Client Testimonials</h2>
                <button className="btn btn-outline btn-sm" onClick={() => setShowReviewModal(true)}>Write a Review</button>
              </div>

              {reviews.length === 0 ? (
                <div className="empty-reviews">
                  <p>No reviews yet. Be the first to vouch for {displayName}!</p>
                </div>
              ) : (
                <div className="reviews-list">
                  {reviews.map(review => (
                    <div key={review._id} className="review-card">
                      <div className="review-header">
                        <div className="reviewer-info">
                          <div className="reviewer-avatar">
                            <CheckCircle size={16} color="#0D8ABC" />
                          </div>
                          <div>
                            <h4>{review.reviewerName}</h4>
                            <div className="rating-stars">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={14} fill={i < review.rating ? "#f59e0b" : "none"} stroke={i < review.rating ? "#f59e0b" : "#cbd5e1"} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="review-date">{new Date(review.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="review-text">{review.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="review-modal-overlay">
          <div className="review-modal glass">
            <h3>Vouch for {displayName}</h3>
            <div className="form-group">
              <label>Rating</label>
              <div className="rating-selector">
                {[1, 2, 3, 4, 5].map(num => (
                  <button key={num} onClick={() => setNewReview({ ...newReview, rating: num })}>
                    <Star size={24} fill={num <= newReview.rating ? "#f59e0b" : "none"} stroke={num <= newReview.rating ? "#f59e0b" : "#cbd5e1"} />
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Your Feedback</label>
              <textarea
                className="form-input"
                rows="4"
                placeholder="Share your experience working with this professional..."
                value={newReview.text}
                onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-secondary" onClick={() => setShowReviewModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePostReview}>Post Review</button>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      <div className="profile-recommendations glass" style={{ marginTop: '2rem', padding: '2rem' }}>
        <h2 className="section-title" style={{ border: 'none' }}>✨ Recommended for You</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Based on your interests in {displayName}'s profile.</p>
        <div className="products-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {/* Mock recommendations */}
          <div className="product-card">
            <div className="product-image-placeholder"><Package size={40} color="#cbd5e1" /></div>
            <div className="product-info">
              <h3>Related Service A</h3>
              <p className="product-price">₹1,200</p>
            </div>
          </div>
          <div className="product-card">
            <div className="product-image-placeholder"><Package size={40} color="#cbd5e1" /></div>
            <div className="product-info">
              <h3>Popular in Industry</h3>
              <p className="product-price">₹3,500</p>
            </div>
          </div>
        </div>
      </div>
      {/* Contact Info Modal */}
      {showContactInfo && (
        <div className="review-modal-overlay" onClick={() => setShowContactInfo(false)}>
          <div className="contact-modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{displayName}</h2>
              <button className="close-btn" onClick={() => setShowContactInfo(false)}>&times;</button>
            </div>
            <div className="contact-modal-body">
              <section className="contact-section">
                <h3>Contact Info</h3>
                <div className="contact-item">
                  <div className="contact-icon-wrapper"><ExternalLink size={20} /></div>
                  <div className="contact-text">
                    <label>Your Profile</label>
                    <a href={window.location.href} target="_blank" rel="noopener noreferrer">{window.location.href}</a>
                  </div>
                </div>

                {profProfile.website && (
                  <div className="contact-item">
                    <div className="contact-icon-wrapper"><Globe size={20} /></div>
                    <div className="contact-text">
                      <label>Website</label>
                      <a href={profProfile.website} target="_blank" rel="noopener noreferrer">{profProfile.website}</a>
                    </div>
                  </div>
                )}

                {user.phone && (
                  <div className="contact-item">
                    <div className="contact-icon-wrapper"><Phone size={20} /></div>
                    <div className="contact-text">
                      <label>Phone</label>
                      <span>{user.phone}</span>
                    </div>
                  </div>
                )}

                {user.email && (
                  <div className="contact-item">
                    <div className="contact-icon-wrapper"><Mail size={20} /></div>
                    <div className="contact-text">
                      <label>Email</label>
                      <a href={`mailto:${user.email}`}>{user.email}</a>
                    </div>
                  </div>
                )}

                {(profProfile.address || user.address || user.city) && (
                  <div className="contact-item">
                    <div className="contact-icon-wrapper"><MapPin size={20} /></div>
                    <div className="contact-text">
                      <label>Address</label>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profProfile.address || user.address || `${user.city}, ${user.state}`)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        {profProfile.address || user.address || `${user.city}, ${user.state}`}
                      </a>
                    </div>
                  </div>
                )}

                {profProfile.whatsapp && (
                  <div className="contact-item">
                    <div className="contact-icon-wrapper"><MessageCircle size={20} /></div>
                    <div className="contact-text">
                      <label>WhatsApp</label>
                      <a href={`https://wa.me/${profProfile.whatsapp}`} target="_blank" rel="noopener noreferrer">Message on WhatsApp</a>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for experience icon
const BuildingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
    <path d="M9 22v-4h6v4"></path>
    <path d="M8 6h.01"></path>
    <path d="M16 6h.01"></path>
    <path d="M12 6h.01"></path>
    <path d="M12 10h.01"></path>
    <path d="M12 14h.01"></path>
    <path d="M16 10h.01"></path>
    <path d="M16 14h.01"></path>
    <path d="M8 10h.01"></path>
    <path d="M8 14h.01"></path>
  </svg>
);

export default PublicProfile;