import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  Search,
  MoreHorizontal,
  Edit,
  Star,
  Paperclip,
  Smile,
  Gift,
  X,
  Check,
  ChevronDown
} from 'lucide-react';
import '@/pages/NetworkHub.css';

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

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  
  if (diff < 1000 * 60) return 'Just now';
  if (diff < 1000 * 60 * 60) return `${Math.floor(diff / (1000 * 60))}m`;
  if (diff < 1000 * 60 * 60 * 24) return `${Math.floor(diff / (1000 * 60 * 60))}h`;
  
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
};

const NetworkHub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [marketplaceProducts, setMarketplaceProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMarketplaceLoading, setIsMarketplaceLoading] = useState(false);
  
  // Messaging States
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConversationsLoading, setIsConversationsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [isNewMessageFlow, setIsNewMessageFlow] = useState(false);
  const [convSearchQuery, setConvSearchQuery] = useState('');

  useEffect(() => {
    if (activeTab === 'home') {
      fetchFeed();
    } else if (activeTab === 'store') {
      fetchMarketplaceProducts();
    } else if (activeTab === 'messaging') {
      fetchConversations();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedConversation && selectedConversation._id) {
      fetchMessages(selectedConversation._id);
    } else {
      setMessages([]);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    setIsConversationsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/network/conversations/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        if (data.length > 0 && !selectedConversation) {
          setSelectedConversation(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsConversationsLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    setIsMessagesLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/network/messages/${convId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation?.otherUser?.id) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/network/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          recipientId: selectedConversation.otherUser.id,
          conversationId: selectedConversation.isNew ? null : selectedConversation._id,
          text: newMessage
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNewMessage('');
        
        if (selectedConversation.isNew) {
          // If it was a new conversation, refresh list and select the real conversation object
          await fetchConversations();
          // Find the newly created conversation in the refreshed list
          const refreshedConvs = await (await fetch(`http://localhost:5000/api/network/conversations/${user.id}`)).json();
          const newConv = refreshedConvs.find(c => c.otherUser.id === selectedConversation.otherUser.id);
          if (newConv) {
            setSelectedConversation(newConv);
          }
        } else {
          setMessages([...messages, data]);
          setConversations(conversations.map(c => 
            c._id === data.conversationId ? { ...c, lastMessage: data.text, lastUpdated: new Date() } : c
          ));
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const searchUsers = async (query) => {
    setRecipientSearch(query);
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/network/users/search?query=${query}&currentUserId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setUserSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const startNewConversation = (recipient) => {
    // Check if conversation already exists
    const existing = conversations.find(c => c.otherUser.id === recipient.id);
    if (existing) {
      setSelectedConversation(existing);
      setIsNewMessageFlow(false);
    } else {
      setSelectedConversation({
        otherUser: recipient,
        isNew: true
      });
      setMessages([]);
      setIsNewMessageFlow(false);
    }
  };

  const fetchMarketplaceProducts = async (query = '') => {
    setIsMarketplaceLoading(true);
    try {
      const url = `http://localhost:5000/api/marketplace/products?userId=${user.id}${query ? `&search=${query}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMarketplaceProducts(data);
      }
    } catch (error) {
      console.error('Error fetching marketplace products:', error);
    } finally {
      setIsMarketplaceLoading(false);
    }
  };

  const trackInteraction = async (productId, productGroup, type = 'view') => {
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

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (activeTab === 'store') {
      // Debounce search in real app, but for now just call it
      fetchMarketplaceProducts(query);
    }
  };

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
            <input 
              type="text" 
              placeholder={activeTab === 'store' ? "Search products, categories, keywords..." : "Search the network..."} 
              value={searchQuery}
              onChange={handleSearch}
            />
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
          ) : activeTab === 'store' ? (
            <div className="marketplace-feed">
              <div className="marketplace-header mb-4">
                <h3>Recommended for Your Business</h3>
                <p className="text-muted">Products and services based on your interests and industry profile.</p>
              </div>

              {isMarketplaceLoading ? (
                <div className="loading-feed">Discovering best products for you...</div>
              ) : marketplaceProducts.length === 0 ? (
                <div className="empty-feed glass">
                  <ShoppingBag size={48} color="#cbd5e1" />
                  <h3>No products found</h3>
                  <p>{searchQuery ? `No products matching "${searchQuery}"` : "The marketplace is quiet today. Check back soon!"}</p>
                </div>
              ) : (
                <div className="marketplace-grid">
                  {marketplaceProducts.map(p => (
                    <div 
                      key={p._id} 
                      className="marketplace-card glass clickable"
                      onClick={() => {
                        trackInteraction(p._id, p.data?.productGroup, 'click');
                        navigate(`/product/${p._id || p.data?.id}`);
                      }}
                    >
                      <div className="product-image-container">
                        {p.data?.image ? (
                          <img src={p.data.image} alt={p.data.name} />
                        ) : (
                          <div className="image-placeholder">
                            <ShoppingBag size={32} />
                          </div>
                        )}
                        {p.recommendationScore > 20 && (
                          <div className="recommendation-badge">Recommended</div>
                        )}
                      </div>
                      <div className="product-info">
                        <div className="product-category">{p.data?.productGroup || 'General'}</div>
                        <h4 className="product-name">{p.data?.name}</h4>
                        <div className="product-price">₹{Number(p.data?.sellingPrice).toLocaleString()}</div>
                        
                        <div className="seller-info-mini">
                          <BusinessLogo name={p.sellerName} image={p.sellerLogo} size="xs" />
                          <span className="seller-name">{p.sellerName}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'messaging' ? (
            <div className="messaging-container glass">
              <div className="messaging-sidebar">
                <div className="messaging-sidebar-header">
                  <h3>Messaging</h3>
                  <div className="messaging-header-actions">
                    <button className="icon-btn-small"><MoreHorizontal size={20} /></button>
                    <button className="icon-btn-small" onClick={() => setIsNewMessageFlow(true)}><Edit size={18} /></button>
                  </div>
                </div>
                <div className="messaging-search">
                  <Search size={16} />
                  <input 
                    type="text" 
                    placeholder="Search messages" 
                    value={convSearchQuery}
                    onChange={(e) => setConvSearchQuery(e.target.value)}
                  />
                </div>
                <div className="messaging-filters">
                  <button className="filter-chip active">Focused <ChevronDown size={14} /></button>
                  <button className="filter-chip">Unread</button>
                  <button className="filter-chip">Starred</button>
                </div>
                <div className="conversations-list">
                  {isConversationsLoading ? (
                    <div className="p-4 text-center text-muted">Loading...</div>
                  ) : (conversations.filter(c => 
                      c.otherUser.name.toLowerCase().includes(convSearchQuery.toLowerCase()) ||
                      c.lastMessage.toLowerCase().includes(convSearchQuery.toLowerCase())
                    ).length === 0) ? (
                    <div className="p-4 text-center text-muted">No conversations found</div>
                  ) : (
                    conversations
                      .filter(c => 
                        c.otherUser.name.toLowerCase().includes(convSearchQuery.toLowerCase()) ||
                        c.lastMessage.toLowerCase().includes(convSearchQuery.toLowerCase())
                      )
                      .map(conv => (
                        <div 
                          key={conv._id} 
                          className={`conversation-item ${selectedConversation?._id === conv._id ? 'active' : ''}`}
                          onClick={() => setSelectedConversation(conv)}
                        >
                        <BusinessLogo name={conv.otherUser.name} image={conv.otherUser.image} size="sm" />
                        <div className="conversation-info">
                          <div className="conv-header">
                            <span className="conv-name">{conv.otherUser.name}</span>
                            <span className="conv-date">{formatDate(conv.lastUpdated)}</span>
                          </div>
                          <p className="conv-last-msg">{conv.lastMessage}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="chat-window">
                {isNewMessageFlow ? (
                  <div className="new-message-pane">
                    <div className="new-message-header">
                      <span>New message</span>
                      <button className="icon-btn-small" onClick={() => setIsNewMessageFlow(false)}><X size={18} /></button>
                    </div>
                    <div className="recipient-search-container">
                      <input 
                        type="text" 
                        placeholder="Type a name or multiple names" 
                        value={recipientSearch}
                        onChange={(e) => searchUsers(e.target.value)}
                        autoFocus
                      />
                      {userSearchResults.length > 0 && (
                        <div className="search-results-dropdown glass">
                          {userSearchResults.map(u => (
                            <div key={u.id} className="search-result-item" onClick={() => startNewConversation(u)}>
                              <BusinessLogo name={u.name} image={u.image} size="sm" />
                              <div className="result-info">
                                <span className="result-name">{u.name}</span>
                                <span className="result-headline">{u.headline}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedConversation ? (
                  <>
                    <div className="chat-header">
                      <div className="chat-header-user">
                        <h4>{selectedConversation.otherUser.name}</h4>
                        {selectedConversation.otherUser.headline && (
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>{selectedConversation.otherUser.headline}</span>
                        )}
                      </div>
                      <div className="chat-header-actions">
                        <button className="icon-btn-small"><MoreHorizontal size={20} /></button>
                        <button className="icon-btn-small"><Star size={18} /></button>
                      </div>
                    </div>
                    
                    <div className="chat-messages">
                      {isMessagesLoading ? (
                        <div className="p-4 text-center">Loading messages...</div>
                      ) : (
                        messages.map((msg, idx) => {
                          const showHeader = idx === 0 || messages[idx-1].senderId !== msg.senderId;
                          return (
                            <div key={msg._id} className={`message-wrapper ${msg.senderId === user.id ? 'sent' : 'received'}`}>
                              {showHeader && (
                                <div className="message-header-chat">
                                  <BusinessLogo 
                                    name={msg.senderId === user.id ? 'You' : selectedConversation.otherUser.name} 
                                    image={msg.senderId === user.id ? user.professionalProfile?.profilePicture : selectedConversation.otherUser.image} 
                                    size="xs" 
                                  />
                                  <span className="sender-name">{msg.senderId === user.id ? 'You' : selectedConversation.otherUser.name}</span>
                                  <span className="msg-time">{formatDate(msg.timestamp)}</span>
                                </div>
                              )}
                              <div className="message-content">
                                <p>{msg.text}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    <div className="chat-input-area">
                      <textarea 
                        placeholder="Write a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <div className="chat-input-actions">
                        <div className="left-actions">
                          <button className="icon-btn-small"><ImageIcon size={18} /></button>
                          <button className="icon-btn-small"><Paperclip size={18} /></button>
                          <button className="icon-btn-small"><Smile size={18} /></button>
                        </div>
                        <div className="right-actions">
                          <button 
                            className="btn btn-primary btn-sm" 
                            disabled={!newMessage.trim()}
                            onClick={handleSendMessage}
                          >
                            Send
                          </button>
                          <button className="icon-btn-small"><MoreHorizontal size={18} /></button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-chat-state">
                    <MessageSquare size={64} color="#cbd5e1" />
                    <h3>Select a conversation to start messaging</h3>
                  </div>
                )}
              </div>
            </div>
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
            <div className="trending-products-list">
              {marketplaceProducts.slice(0, 3).map(p => (
                <div 
                  key={`trending-${p._id}`} 
                  className="trending-item clickable"
                  onClick={() => {
                    trackInteraction(p._id, p.data?.productGroup, 'click');
                    navigate(`/product/${p._id || p.data?.id}`);
                  }}
                >
                  <div className="trending-img">
                    {p.data?.image ? <img src={p.data.image} alt="" /> : <ShoppingBag size={14} />}
                  </div>
                  <div className="trending-details">
                    <span className="trending-name">{p.data?.name}</span>
                    <span className="trending-price">₹{Number(p.data?.sellingPrice).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {marketplaceProducts.length === 0 && (
                <div className="empty-trending">
                  <p>More products coming soon...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkHub;
