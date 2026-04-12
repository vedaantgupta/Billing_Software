import React, { useState, useEffect, useCallback } from 'react';
import { getItems, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { Search, UserPlus, Edit2, Trash2, ChevronRight, Users, Building2, Store } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ContactModal from '../components/ContactModal';
import '../Ledger.css';

const Contacts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [contacts, setContacts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const loadContacts = useCallback(async () => {
    if (user?.id) {
      setLoading(true);
      const data = await getItems('contacts', user.id);
      setContacts(data);
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Handle auto-edit from profile page
  useEffect(() => {
    if (location.state?.editId && contacts.length > 0) {
      const contactToEdit = contacts.find(c => 
        (c._dbId === location.state.editId || c.id === location.state.editId)
      );
      if (contactToEdit) {
        setEditingData(contactToEdit);
        setIsModalOpen(true);
        // Clear state so it doesn't reopen on refresh
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, contacts, navigate]);

  const handleEdit = (e, contact) => {
    e.stopPropagation();
    setEditingData(contact);
    setIsModalOpen(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this contact?')) {
      const success = await deleteItem('contacts', id, user.id);
      if (success) {
        setContacts(prev => prev.filter(c => c._dbId !== id && c.id !== id));
      }
    }
  };

  const filteredContacts = contacts.filter(c => {
    const name = c.companyName || c.contactName || c.name || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || '').includes(searchQuery) ||
      (c.gstin || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || (c.type || 'customer') === filterType;
    return matchesSearch && matchesType;
  });

  const customerCount = contacts.filter(c => (c.type || 'customer') === 'customer').length;
  const vendorCount = contacts.filter(c => c.type === 'vendor').length;

  if (loading) {
    return (
      <div className="l-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-slate-500 font-bold text-lg animate-pulse">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="l-page">
      {/* Page Header */}
      <div className="l-header">
        <h1 className="l-title">
          <div className="l-title-icon"><Users size={24} /></div>
          Contacts Management
        </h1>
        <button className="l-btn-primary" onClick={() => { setEditingData(null); setIsModalOpen(true); }}>
          <UserPlus size={18} /> Add Contact
        </button>
      </div>

      {/* Summary Cards */}
      <div className="l-dashboard">
        <div className="l-card receivable">
          <div className="l-card-header">
            <span className="l-card-label">Customers</span>
            <div className="l-card-icon"><Building2 size={24} /></div>
          </div>
          <div className="l-card-value">{customerCount}</div>
          <div className="l-card-subtext">Total active customers in your directory</div>
        </div>

        <div className="l-card payable">
          <div className="l-card-header">
            <span className="l-card-label">Vendors</span>
            <div className="l-card-icon"><Store size={24} /></div>
          </div>
          <div className="l-card-value">{vendorCount}</div>
          <div className="l-card-subtext">Total active vendors / suppliers in your directory</div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="l-control-bar">
        <div className="l-search-box">
          <Search className="l-search-icon" size={20} />
          <input
            className="l-search-input"
            placeholder="Search by name, phone, or GSTIN..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="l-filters">
          <button
            className={`l-filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Contacts
          </button>
          <button
            className={`l-filter-btn ${filterType === 'customer' ? 'active' : ''}`}
            onClick={() => setFilterType('customer')}
          >
            Customers
          </button>
          <button
            className={`l-filter-btn ${filterType === 'vendor' ? 'active' : ''}`}
            onClick={() => setFilterType('vendor')}
          >
            Vendors
          </button>
        </div>
      </div>

      {/* Contacts List */}
      <div className="l-accounts-list">
        {filteredContacts.map(c => {
          const name = c.companyName || c.contactName || c.name || 'Unknown';
          const initial = name[0].toUpperCase();
          const type = c.type || 'customer';
          const location = [c.billing?.city || c.city, c.billing?.state || c.state].filter(Boolean).join(', ');

          return (
            <div
              key={c._dbId || c.id}
              className="l-account-row"
              onClick={() => navigate(`/contacts/${c._dbId || c.id}`)}
              title={`View ${name}'s Profile`}
            >
              {/* Left: Avatar + Info */}
              <div className="l-account-left">
                <div className={`l-avatar ${type}`}>
                  {initial}
                </div>
                <div className="l-account-info">
                  <h3 className="l-account-name">{name}</h3>
                  <div className="l-account-meta">
                    <span className={`l-account-type ${type}`}>
                      {type.toUpperCase()}
                    </span>
                    {c.phone && (
                      <span className="l-account-phone">{c.phone}</span>
                    )}
                    {c.gstin && (
                      <span className="l-account-phone" style={{ color: '#94a3b8' }}>GST: {c.gstin}</span>
                    )}
                    {location && (
                      <span className="l-account-phone">{location}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions + Arrow */}
              <div className="l-account-right">
                {/* Action Buttons */}
                <div
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={e => handleEdit(e, c)}
                    title="Edit Contact"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      color: '#4f46e5',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#e0e7ff';
                      e.currentTarget.style.borderColor = '#c7d2fe';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={e => handleDelete(e, c._dbId || c.id)}
                    title="Delete Contact"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      color: '#ef4444',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#fee2e2';
                      e.currentTarget.style.borderColor = '#fecaca';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="l-arrow-icon">
                  <ChevronRight size={24} />
                </div>
              </div>
            </div>
          );
        })}

        {filteredContacts.length === 0 && (
          <div className="l-empty-state">
            <Users className="l-empty-icon" size={64} />
            <div className="l-empty-text">
              {searchQuery || filterType !== 'all'
                ? 'No contacts match your search or filter.'
                : 'No contacts yet. Click "Add Contact" to get started.'}
            </div>
          </div>
        )}
      </div>

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingData(null); }}
        onSave={() => loadContacts()}
        editingId={editingData?._dbId || editingData?.id}
        initialData={editingData}
      />
    </div>
  );
};

export default Contacts;
