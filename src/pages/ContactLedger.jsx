import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItems, addItem, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { getContactBalance, postToLedger, generateReminderLink } from '../utils/ledger';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Share2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  X,
  CreditCard,
  FileText
} from 'lucide-react';
import './ContactLedger.css'; // Import the new premium UI CSS

const ContactLedger = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [contact, setContact] = useState(null);
  const [balanceInfo, setBalanceInfo] = useState({ balance: 0, position: 'Dr', transactions: [], debit: 0, credit: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTx, setNewTx] = useState({ type: 'dr', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    try {
      const contacts = await getItems('contacts', user.id);
      const foundContact = contacts.find(c => c.id === id);
      setContact(foundContact);

      const info = await getContactBalance(id, user.id);
      setBalanceInfo(info);
    } catch (err) {
      console.error('Failed to load contact ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!user?.id || !id || !newTx.amount) return;

    setIsSubmitting(true);
    try {
      await postToLedger({
        contactId: id,
        contactName: contact.companyName || contact.customerName || contact.name,
        ...newTx,
        docType: newTx.type === 'dr' ? 'Cash Out / Invoice' : 'Cash In / Payment'
      }, user.id);
      
      setIsModalOpen(false);
      setNewTx({ type: 'dr', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      await loadData();
    } catch (err) {
      console.error('Failed to add transaction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTx = async (txId) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      await deleteItem('ledger_transactions', txId, user.id);
      await loadData();
    }
  };

  const handleReminder = () => {
    const link = generateReminderLink(contact, balanceInfo);
    if (link) window.open(link, '_blank');
    else alert('Phone number not available for this contact.');
  };

  if (loading) return <div className="cl-page" style={{ alignItems: 'center', justifyContent: 'center' }}><div className="text-gray-500 font-semibold animate-pulse">Loading Ledger...</div></div>;
  if (!contact) return <div className="cl-page" style={{ alignItems: 'center', justifyContent: 'center' }}><div className="text-gray-500 font-semibold">Contact not found.</div></div>;

  const sortedTransactions = [...(balanceInfo.transactions || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="cl-page">
      {/* Header */}
      <div className="cl-header">
        <div className="cl-header-left">
          <button className="cl-back-btn" onClick={() => navigate('/ledger')} title="Back to Ledgers">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="cl-title">{contact.companyName || contact.customerName || contact.name}</h1>
            <div className="flex items-center gap-2 mt-1">
               <span className={`cl-badge ${contact.type === 'vendor' ? 'vendor' : 'customer'}`}>
                  {contact.type}
               </span>
               <span className="text-sm text-slate-500 font-semibold uppercase tracking-wide">
                  Ledger Detail
               </span>
            </div>
          </div>
        </div>
        <div className="cl-header-actions">
           <button className="cl-btn cl-btn-secondary" onClick={handleReminder}>
              <Share2 size={16} /> Send Reminder
           </button>
           <button className="cl-btn cl-btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> Record Entry
           </button>
        </div>
      </div>

      {/* Dashboard Balances */}
      <div className="cl-dashboard">
        <div className={`cl-card overall ${balanceInfo.position === 'Dr' ? 'dr-border' : balanceInfo.position === 'Cr' ? 'cr-border' : ''}`}>
           <div className="cl-card-header">
              <span className="cl-card-label">Current Balance</span>
              <div className="cl-card-icon overall"><Wallet size={18} /></div>
           </div>
           <div className={`cl-card-value overall ${balanceInfo.position === 'Dr' ? 'dr' : balanceInfo.position === 'Cr' ? 'cr' : ''}`}>
             ₹{Number(balanceInfo.balance).toLocaleString()}
           </div>
           <div className={`cl-card-subtext ${balanceInfo.position === 'Dr' ? 'dr' : balanceInfo.position === 'Cr' ? 'cr' : ''}`}>
             {balanceInfo.position === 'Dr' && 'You will collect (Dr)'}
             {balanceInfo.position === 'Cr' && 'You will pay (Cr)'}
             {balanceInfo.position === '' && 'Settled'}
           </div>
        </div>
        <div className="cl-card debit">
           <div className="cl-card-header">
              <span className="cl-card-label">Total Debit (Out)</span>
              <div className="cl-card-icon debit"><ArrowUpRight size={18} /></div>
           </div>
           <div className="cl-card-value dr">₹{Number(balanceInfo.debit || 0).toLocaleString()}</div>
           <div className="cl-card-subtext dr text-slate-500">Total items sold / payment given</div>
        </div>
        <div className="cl-card credit">
           <div className="cl-card-header">
              <span className="cl-card-label">Total Credit (In)</span>
              <div className="cl-card-icon credit"><ArrowDownLeft size={18} /></div>
           </div>
           <div className="cl-card-value cr">₹{Number(balanceInfo.credit || 0).toLocaleString()}</div>
           <div className="cl-card-subtext cr text-slate-500">Total payment received / items bought</div>
        </div>
      </div>

      {/* History Section */}
      <div className="cl-history-section">
        <div className="cl-history-header">
           <div className="cl-history-title">
             <Calendar size={18} className="text-indigo-500" />
             Transaction History
           </div>
        </div>
        <div className="cl-table-container">
          <table className="cl-table">
             <thead>
               <tr>
                 <th>Date</th>
                 <th>Transaction Type/Notes</th>
                 <th>Ref / Document</th>
                 <th align="right">Amount</th>
                 <th align="center">Action</th>
               </tr>
             </thead>
             <tbody>
               {sortedTransactions.length > 0 ? (
                 sortedTransactions.map(tx => (
                   <tr key={tx.id}>
                     <td>
                        <div className="font-semibold text-slate-700">{tx.date}</div>
                     </td>
                     <td>
                        <div className="flex items-center gap-3">
                           <div className={`cl-tx-icon ${tx.type === 'dr' ? 'dr' : 'cr'}`}>
                              {tx.type === 'dr' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                           </div>
                           <div>
                              <div className="cl-tx-desc">{tx.description || (tx.type === 'dr' ? 'Debit Entry' : 'Credit Entry')}</div>
                              <div className="cl-tx-meta">{tx.type === 'dr' ? 'Cash Out / Given' : 'Cash In / Received'}</div>
                           </div>
                        </div>
                     </td>
                     <td>
                        <div className="font-medium text-slate-500">{tx.docType || 'Manual Entry'}</div>
                     </td>
                     <td align="right">
                        <div className={`cl-tx-amount ${tx.type === 'dr' ? 'dr' : 'cr'}`}>
                           {tx.type === 'dr' ? '−' : '+'} ₹{Number(tx.amount).toLocaleString()}
                        </div>
                     </td>
                     <td align="center">
                        <div className="flex justify-center">
                           <button 
                             className="cl-action-btn" 
                             onClick={() => handleDeleteTx(tx.id)}
                             title="Delete Transaction"
                           >
                              <Trash2 size={16} />
                           </button>
                        </div>
                     </td>
                   </tr>
                 ))
               ) : (
                 <tr>
                    <td colSpan="5">
                       <div className="empty-state">
                         <FileText size={48} />
                         <div className="empty-state-text">No transactions recorded yet</div>
                         <button className="cl-btn cl-btn-primary mt-2" onClick={() => setIsModalOpen(true)}>
                           Record First Entry
                         </button>
                       </div>
                    </td>
                 </tr>
               )}
             </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Transaction Form */}
      {isModalOpen && (
        <div className="cl-slide-overlay">
           <div className="cl-slide-pane border-l border-slate-200">
              <div className="cl-slide-header">
                 <h2 className="cl-slide-title">Record Entry</h2>
                 <button className="cl-close-btn" onClick={() => setIsModalOpen(false)}>
                    <X size={20} />
                 </button>
              </div>
              <div className="cl-slide-body">
                 
                 <div className="cl-type-toggle">
                    <button 
                      type="button"
                      className={`cl-type-btn ${newTx.type === 'dr' ? 'active dr' : ''}`}
                      onClick={() => setNewTx({...newTx, type: 'dr'})}
                    >
                      You Gave (Debit)
                    </button>
                    <button 
                      type="button"
                      className={`cl-type-btn ${newTx.type === 'cr' ? 'active cr' : ''}`}
                      onClick={() => setNewTx({...newTx, type: 'cr'})}
                    >
                      You Got (Credit)
                    </button>
                 </div>

                 <form id="ledgerEntryForm" onSubmit={handleAddTransaction}>
                    <div className="cl-form-group">
                       <label className="cl-form-label">Amount (₹) <span className="text-rose-500">*</span></label>
                       <input 
                          required 
                          type="number" 
                          min="0.01"
                          step="0.01"
                          autoFocus
                          className="cl-form-input text-xl font-bold" 
                          placeholder="0.00" 
                          value={newTx.amount} 
                          onChange={e => setNewTx({...newTx, amount: e.target.value})} 
                       />
                    </div>
                    
                    <div className="cl-form-group">
                       <label className="cl-form-label">Date <span className="text-rose-500">*</span></label>
                       <input 
                          required
                          type="date" 
                          className="cl-form-input" 
                          value={newTx.date} 
                          onChange={e => setNewTx({...newTx, date: e.target.value})} 
                       />
                    </div>

                    <div className="cl-form-group">
                       <label className="cl-form-label">Notes / Description</label>
                       <textarea 
                          className="cl-form-input" 
                          rows="3"
                          placeholder="e.g., Payment for Invoice #102, Cash Advance" 
                          value={newTx.description} 
                          onChange={e => setNewTx({...newTx, description: e.target.value})} 
                       ></textarea>
                    </div>

                 </form>
              </div>
              <div className="cl-slide-footer">
                 <button className="cl-btn cl-btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                 </button>
                 <button form="ledgerEntryForm" type="submit" className="cl-btn cl-btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Entry'}
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default ContactLedger;
