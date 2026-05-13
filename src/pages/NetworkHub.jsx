import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Heart, 
  Share2, 
  ImageIcon, 
  Send, 
  User, 
  Home, 
  Users, 
  ShoppingBag, 
  Briefcase, 
  Bell, 
  Search 
} from 'lucide-react';
import './NetworkHub.css';

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

const NetworkHub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/network/feed');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    try {
      const postData = {
        authorId: user.id,
        authorName: user.firstName ? `${user.firstName} ${user.lastName}` : user.username || 'User',
        authorImage: user.professionalProfile?.profilePicture,
        content: newPostContent,
        likes: [],
        comments: []
      };

      const response = await fetch('http://localhost:5000/api/network/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (response.ok) {
        setNewPostContent('');
        fetchFeed(); // Refresh feed
      }
    } catch (error) {
      console.error('Error posting:', error);
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await fetch('http://localhost:5000/api/network/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, userId: user.id })
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(posts.map(p => p._id === postId ? { ...p, likes: data.likes } : p));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const tabs = [
    { id: 'home', label: 'Home', icon: <BusinessLogo name={user.firstName ? `${user.firstName} ${user.lastName}` : user.username} image={user.professionalProfile?.profilePicture} size="xs" /> },
    { id: 'network', label: 'My Network', icon: <Users size={18} /> },
    { id: 'store', label: 'Store', icon: <ShoppingBag size={18} /> },
    { id: 'jobs', label: 'Jobs', icon: <Briefcase size={18} /> },
    { id: 'messaging', label: 'Messaging', icon: <MessageSquare size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  ];

  return (
    <div className="network-hub-container">
      <div className="network-header-enhanced glass">
        <div className="header-top">
          <div>
            <h2>Business Network Hub</h2>
            <p>Connect with other businesses, share updates, and discover products.</p>
          </div>
          <div className="header-search">
            <Search size={18} />
            <input type="text" placeholder="Search the network..." />
          </div>
        </div>
        
        <div className="network-tabs-bar">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              className={`network-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="network-content">
        <div className="network-main-feed">
          {activeTab === 'home' ? (
            <>
              <div className="create-post-card glass">
                <div className="post-input-container">
                  <div className="user-avatar-small">
                    <BusinessLogo 
                      name={user.firstName ? `${user.firstName} ${user.lastName}` : user.username} 
                      image={user.professionalProfile?.profilePicture}
                      size="sm" 
                    />
                  </div>
                  <textarea
                    placeholder="Share a business update, new product, or achievement..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="post-actions-row">
                  <button className="icon-btn"><ImageIcon size={18} /> Photo</button>
                  <button className="btn btn-primary" onClick={handlePostSubmit} disabled={!newPostContent.trim()}>
                    <Send size={16} /> Post Update
                  </button>
                </div>
              </div>

              <div className="feed-posts">
                {isLoading ? (
                  <div className="loading-feed">Loading network updates...</div>
                ) : posts.length === 0 ? (
                  <div className="empty-feed glass">
                    <MessageSquare size={48} color="#cbd5e1" />
                    <h3>No updates yet</h3>
                    <p>Be the first to share an update with the network!</p>
                  </div>
                ) : (
                  posts.map(post => (
                    <div key={post._id} className="post-card glass">
                      <div className="post-header">
                        <div
                          className="post-author-info"
                          onClick={() => navigate(`/p/${post.authorId}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="user-avatar">
                            <BusinessLogo 
                              name={post.authorName} 
                              image={post.authorImage}
                              size="md" 
                            />
                          </div>
                          <div>
                            <h4 className="author-name">{post.authorName}</h4>
                            <span className="post-time">{formatDate(post.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="post-body">
                        <p>{post.content}</p>
                      </div>
                      <div className="post-footer">
                        <button
                          className={`action-btn ${post.likes?.includes(user.id) ? 'liked' : ''}`}
                          onClick={() => handleLike(post._id)}
                        >
                          <Heart size={18} fill={post.likes?.includes(user.id) ? 'currentColor' : 'none'} />
                          {post.likes?.length || 0} Likes
                        </button>
                        <button className="action-btn">
                          <MessageSquare size={18} />
                          {post.comments?.length || 0} Comments
                        </button>
                        <button className="action-btn">
                          <Share2 size={18} /> Share
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="tab-placeholder glass">
              <div className="placeholder-content">
                {tabs.find(t => t.id === activeTab)?.icon}
                <h3>{tabs.find(t => t.id === activeTab)?.label} Section</h3>
                <p>This section is currently under development. Stay tuned for more business networking features!</p>
              </div>
            </div>
          )}
        </div>

        <div className="network-sidebar">
          <div className="glass sidebar-widget">
            <h3>Your Profile</h3>
            <div className="mini-profile">
              <BusinessLogo 
                name={user.firstName ? `${user.firstName} ${user.lastName}` : user.username} 
                image={user.professionalProfile?.profilePicture}
                size="lg" 
                className="mx-auto mb-4" 
              />
              <h4>{user.firstName ? `${user.firstName} ${user.lastName}` : user.username}</h4>
              <p>View your public profile</p>
              <button className="btn btn-outline" onClick={() => navigate(`/p/${user.id}`)} style={{ width: '100%', marginTop: '10px' }}>
                View Profile
              </button>
            </div>
          </div>

          <div className="glass sidebar-widget trending-widget">
            <h3>Trending Marketplace</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Discover top products from other businesses.</p>
            <div className="empty-trending">
              <p>More products coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkHub;
