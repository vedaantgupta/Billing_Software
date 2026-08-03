import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Heart, 
  Share2, 
  ImageIcon, 
  Send, 
  Users, 
  Briefcase, 
  Bell, 
  Search,
  MoreHorizontal,
  Edit,
  Star,
  Paperclip,
  Smile,
  X,
  Check,
  ChevronDown,
  ShoppingBag
} from 'lucide-react';
import '@/features/network/styles/NetworkHub.css';

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
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // Saved Sellers (IndiaMART B2B Network)
  const [savedSellers, setSavedSellers] = useState([]);
  const [isSavedLoading, setIsSavedLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'home') {
      fetchFeed();
    } else if (activeTab === 'messaging') {
      fetchConversations();
    } else if (activeTab === 'network') {
      fetchSavedSellers();
    }
  }, [activeTab]);

  const fetchSavedSellers = async () => {
    if (!user?.id) return;
    setIsSavedLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/marketplace/saved-sellers?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSavedSellers(data);
      }
    } catch (error) {
      console.error('Error fetching saved sellers:', error);
    } finally {
      setIsSavedLoading(false);
    }
  };

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
          await fetchConversations();
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

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
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
        fetchFeed();
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

  const tabs = [
    { id: 'home', label: 'Home', icon: <BusinessLogo name={user.firstName ? `${user.firstName} ${user.lastName}` : user.username} image={user.professionalProfile?.profilePicture} size="xs" /> },
    { id: 'network', label: 'My Network', icon: <Users size={18} /> },
    { id: 'jobs', label: 'Jobs', icon: <Briefcase size={18} /> },
    { id: 'messaging', label: 'Messaging', icon: <MessageSquare size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  ];

  const filteredPosts = posts.filter(post => 
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.authorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="network-hub-container">
      <div className="network-header-enhanced glass">
        <div className="header-top">
          <div>
            <h2>Business Network Hub</h2>
            <p>Connect with other businesses, share updates, and discover collaborations.</p>
          </div>
          <div className="header-search">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search the network..." 
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
                ) : filteredPosts.length === 0 ? (
                  <div className="empty-feed glass">
                    <MessageSquare size={48} color="#cbd5e1" />
                    <h3>No updates found</h3>
                    <p>Try resetting your search or be the first to share an update!</p>
                  </div>
                ) : (
                  filteredPosts.map(post => (
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
                        placeholder="Type a name" 
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
          ) : activeTab === 'network' ? (
            <div className="saved-suppliers-network-view glass" style={{ padding: '1.5rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>My B2B Suppliers ({savedSellers.length})</h3>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>IndiaMART Network: Saved vendors, private payment notes & quick messaging</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/store')}>
                  + Discover More Suppliers in Marketplace
                </button>
              </div>

              {isSavedLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading your B2B supplier network...</div>
              ) : savedSellers.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <Users size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ margin: 0, color: '#1e293b' }}>No Saved Suppliers Yet</h4>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '360px', margin: '0.5rem auto 1.5rem auto' }}>
                    Bookmark sellers in the Marketplace Store or Product pages to add them to your IndiaMART supplier directory.
                  </p>
                  <button className="btn btn-primary" onClick={() => navigate('/store')}>
                    Browse Marketplace
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {savedSellers.map(doc => {
                    const seller = doc.seller || {};
                    return (
                      <div key={doc._id} className="post-card glass" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                          <BusinessLogo name={seller.name || seller.companyName} image={seller.image} size="md" />
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {seller.companyName || seller.name}
                            </h4>
                            <span style={{ display: 'inline-block', fontSize: '0.7rem', fontWeight: 800, color: '#0d8abc', background: 'rgba(13,138,188,0.1)', padding: '2px 8px', borderRadius: '12px', marginTop: '2px' }}>
                              ⭐ {doc.relationshipTag || 'Saved Supplier'}
                            </span>
                          </div>
                        </div>

                        {doc.customNotes && (
                          <div style={{ background: '#f8fafc', borderLeft: '3px solid #0d8abc', padding: '0.5rem 0.75rem', borderRadius: '0 6px 6px 0', fontSize: '0.8rem', color: '#334155' }}>
                            <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Private Note:</span>
                            {doc.customNotes}
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto' }}>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              startNewConversation({ id: seller.id, name: seller.companyName || seller.name, image: seller.image });
                              setActiveTab('messaging');
                            }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.78rem' }}
                          >
                            <MessageSquare size={14} /> Message
                          </button>
                          <button 
                            className="btn btn-outline btn-sm"
                            onClick={() => navigate(`/store`)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.78rem' }}
                          >
                            <ShoppingBag size={14} /> Products ({seller.totalProducts || 0})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
        </div>
      </div>
    </div>
  );
};

export default NetworkHub;
