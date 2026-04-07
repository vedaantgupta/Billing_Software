import React, { useState, useEffect, useCallback } from 'react';
import { getItems, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { Plus, CreditCard, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ContactModal from '../components/ContactModal';

const Contacts = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  
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

  const handleEdit = (contact) => {
    setEditingData(contact);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      const success = await deleteItem('contacts', id, user.id);
      if (success) {
        setContacts(contacts.filter(c => c.id !== id && c._dbId !== id));
      }
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Contacts Management</h1>
          <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Manage your customers and vendors directory</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingData(null); setIsModalOpen(true); }}>
          <Plus size={18} /> Add Contact
        </button>
      </div>

      <div className="glass" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Name</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Type</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>GSTIN</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Phone</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Location</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading contacts...</td>
              </tr>
            ) : contacts.length > 0 ? (
              contacts.map(c => (
                <tr key={c.id || Math.random().toString()} style={{ borderBottom: '1px solid var(--border-color)', transition: 'all 0.2s' }} className="hover-bg-gray-50">
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{c.name || c.companyName || c.contactName || 'Unknown'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem',
                      background: (c.type || 'customer') === 'customer' ? '#e0e7ff' : '#fce7f3',
                      color: (c.type || 'customer') === 'customer' ? '#3730a3' : '#9d174d',
                      fontWeight: 700
                    }}>
                      {(c.type || 'customer').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>{c.gstin || <span style={{ color: '#cbd5e1' }}>N/A</span>}</td>
                  <td style={{ padding: '1rem' }}>{c.phone || <span style={{ color: '#cbd5e1' }}>N/A</span>}</td>
                  <td style={{ padding: '1rem' }}>{c.billing?.city || c.city || 'N/A'}, {c.billing?.state || c.state || 'N/A'}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div className="flex justify-end gap-2">
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => navigate(`/ledger/${c.id}`)}
                        title="View Ledger"
                        style={{ padding: '0.4rem', minWidth: 'auto' }}
                      >
                        <CreditCard size={16} />
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleEdit(c)}
                        title="Edit Contact"
                        style={{ padding: '0.4rem', minWidth: 'auto' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleDelete(c._dbId || c.id)}
                        title="Delete Contact"
                        style={{ padding: '0.4rem', minWidth: 'auto', color: '#ef4444' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                   <div style={{ opacity: 0.5, marginBottom: '1rem' }}><Plus size={48} style={{ margin: '0 auto' }} /></div>
                   No contacts found. Click "Add Contact" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ContactModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={() => loadContacts()}
        editingId={editingData?._dbId || editingData?.id}
        initialData={editingData}
      />
    </div>
  );
};

export default Contacts;
