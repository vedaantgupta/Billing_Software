import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Edit, Trash2, Printer, Copy, Send, 
  FileText, X
} from 'lucide-react';
import { getItems, addItem, deleteItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import PrintViewModal from '@/components/ui/PrintViewModal';
import CommunicationModal from '@/features/communication/components/CommunicationModal';
import '@/features/expenses/styles/DailyExpenses.css';

const DailyExpenses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  // Modals
  const [printDoc, setPrintDoc] = useState(null);
  const [sendDoc, setSendDoc] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  const fetchExpenses = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getItems('dailyExpenses', user.id);
      // Sort newest first
      setExpenses(data.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)));
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // Category filter
      if (categoryFilter !== 'ALL' && (exp.category || 'General').toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      // Payment filter
      if (paymentFilter !== 'ALL' && (exp.paymentType || 'CASH').toUpperCase() !== paymentFilter.toUpperCase()) {
        return false;
      }
      // Search term
      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase();
      const titleMatch = (exp.title || exp.msName || exp.vendorInfo?.ms || '').toLowerCase().includes(query);
      const noMatch = (exp.expenseNo || '').toString().toLowerCase().includes(query);
      const catMatch = (exp.category || '').toLowerCase().includes(query);
      const payMatch = (exp.paymentType || '').toLowerCase().includes(query);
      const noteMatch = (exp.items?.[0]?.note || exp.notes || '').toLowerCase().includes(query);
      return titleMatch || noMatch || catMatch || payMatch || noteMatch;
    });
  }, [expenses, searchTerm, categoryFilter, paymentFilter]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.grandTotal || e.total || e.amount || 0), 0);
  }, [filteredExpenses]);

  // Actions
  const handleDelete = async (id) => {
    if (!user?.id) return;
    if (window.confirm('Are you sure you want to permanently delete this expense?')) {
      const success = await deleteItem('dailyExpenses', id, user.id);
      if (success) {
        setExpenses(prev => prev.filter(e => e._dbId !== id));
        setSelectedItems(prev => prev.filter(i => i !== id));
      }
    }
  };

  const handleBulkDelete = async () => {
    if (!user?.id || selectedItems.length === 0) return;
    if (window.confirm(`Permanently delete ${selectedItems.length} selected expense(s)?`)) {
      for (const id of selectedItems) {
        await deleteItem('dailyExpenses', id, user.id);
      }
      setExpenses(prev => prev.filter(e => !selectedItems.includes(e._dbId)));
      setSelectedItems([]);
    }
  };

  const handleDuplicate = async (expense) => {
    if (!user?.id) return;
    const nextNo = (expenses.length + 1).toString();
    const cloned = {
      ...expense,
      id: undefined,
      _dbId: undefined,
      _id: undefined,
      expenseNo: nextNo,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    await addItem('dailyExpenses', cloned, user.id);
    await fetchExpenses();
    alert(`Expense duplicated successfully as #${nextNo}!`);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(filteredExpenses.map(e => e._dbId));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(i => i !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const openPrintModal = (expense) => {
    setPrintDoc({
      ...expense,
      docType: 'Daily Expense',
      invoiceNumber: expense.expenseNo ? `EXP-${expense.expenseNo}` : 'EXP-1',
      customerName: expense.title || expense.msName || expense.vendorInfo?.ms || 'Payee',
      total: expense.grandTotal || expense.total || expense.amount || 0,
      amount: expense.grandTotal || expense.total || expense.amount || 0,
      date: expense.date || new Date().toISOString().split('T')[0]
    });
  };

  const openSendModal = (expense) => {
    setSendDoc({
      ...expense,
      docType: 'Daily Expense',
      invoiceNumber: expense.expenseNo ? `EXP-${expense.expenseNo}` : 'EXP-1',
      customerName: expense.title || expense.msName || expense.vendorInfo?.ms || 'Payee',
      total: expense.grandTotal || expense.total || expense.amount || 0,
      amount: expense.grandTotal || expense.total || expense.amount || 0,
      date: expense.date || new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="expenses-doc-page">
      {/* Page Header */}
      <div className="page-header print-hide">
        <div className="header-info">
          <div className="page-badge-row">
            <span className="page-badge">EXPENSE VOUCHERS</span>
          </div>
          <h1 className="page-title">Daily Expenses</h1>
          <p className="page-subtitle">Track, record, and print official vouchers for your daily business expenditures</p>
        </div>

        <div className="header-actions">
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/expenses/daily/new')}
          >
            <Plus size={18} /> Add New Expense
          </button>
        </div>
      </div>

      {/* Modern Filter Toolbar */}
      <div className="table-controls-bar print-hide">
        <div className="controls-left">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search payee, voucher no, category or note..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
                <X size={15} />
              </button>
            )}
          </div>

          <div className="filter-dropdown-wrapper">
            <select 
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Travel & Conveyance">Travel & Conveyance</option>
              <option value="Utilities & Bills">Utilities & Bills</option>
              <option value="Staff Welfare & Tea">Staff Welfare & Tea</option>
              <option value="Repairs & Maintenance">Repairs & Maintenance</option>
              <option value="Marketing & Advertising">Marketing & Advertising</option>
              <option value="Food & Beverages">Food & Beverages</option>
              <option value="Rent & Lease">Rent & Lease</option>
              <option value="General">General / Others</option>
            </select>
          </div>

          <div className="filter-dropdown-wrapper">
            <select 
              className="filter-select"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="ALL">All Payment Modes</option>
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online / UPI</option>
              <option value="BANK TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
        </div>

        <div className="controls-right">
          {/* Clean inline summary pill */}
          <div className="table-summary-pill">
            <span className="summary-count">{filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}</span>
            <span className="summary-divider">•</span>
            <span className="summary-amount">Total: ₹{totalFilteredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {selectedItems.length > 0 && (
            <div className="bulk-actions-wrapper">
              <button 
                className="btn btn-danger-outline" 
                onClick={handleBulkDelete}
              >
                <Trash2 size={15} /> Delete Selected ({selectedItems.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Document-Style Data Table */}
      <div className="glass table-card print-hide">
        <table className="doc-style-table">
          <thead>
            <tr>
              <th style={{ width: '42px', textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={selectedItems.length === filteredExpenses.length && filteredExpenses.length > 0} 
                />
              </th>
              <th style={{ width: '130px' }}>DATE</th>
              <th style={{ width: '130px' }}>VOUCHER NO</th>
              <th>PAYEE / PARTY</th>
              <th style={{ width: '160px' }}>AMOUNT</th>
              <th style={{ width: '150px' }}>CATEGORY</th>
              <th style={{ width: '140px' }}>PAYMENT MODE</th>
              <th style={{ textAlign: 'center', width: '210px' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="empty-loading-cell">
                  Loading expenses...
                </td>
              </tr>
            ) : filteredExpenses.length === 0 ? (
              <tr className="empty-state-row">
                <td colSpan="8">
                  <div className="empty-state-wrapper">
                    <FileText size={44} strokeWidth={1.5} className="empty-icon" />
                    <h3 className="empty-title">No Expense Vouchers Found</h3>
                    <p className="empty-desc">
                      {searchTerm || categoryFilter !== 'ALL' || paymentFilter !== 'ALL'
                        ? 'No expenses match your selected filters. Try adjusting search or filter options.' 
                        : 'Start recording daily business expenses to track cash outflows and print official vouchers.'}
                    </p>
                    <button 
                      className="btn btn-primary" 
                      style={{ marginTop: '1rem' }} 
                      onClick={() => navigate('/expenses/daily/new')}
                    >
                      <Plus size={16} /> Add New Expense
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((expense) => {
                const amt = Number(expense.grandTotal || expense.total || expense.amount || 0);
                const title = expense.title || expense.msName || expense.vendorInfo?.ms || 'Payee';
                const pType = (expense.paymentType || 'CASH').toUpperCase();
                const num = expense.expenseNo ? `EXP-${expense.expenseNo}` : 'EXP-1';
                const dateStr = expense.date || expense.createdAt?.split('T')[0] || '-';
                const initial = title ? title.charAt(0).toUpperCase() : 'E';

                return (
                  <tr key={expense._dbId || Math.random()} className={selectedItems.includes(expense._dbId) ? 'row-selected' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedItems.includes(expense._dbId)} 
                        onChange={() => handleSelectItem(expense._dbId)}
                      />
                    </td>
                    <td className="date-col">
                      {dateStr}
                    </td>
                    <td className="number-col">
                      <span className="voucher-no-badge">{num}</span>
                    </td>
                    <td className="party-col">
                      <div className="party-cell-wrapper">
                        <div className="party-avatar">{initial}</div>
                        <div>
                          <div className="party-text" title={title}>{title}</div>
                          {expense.items?.[0]?.name && (
                            <div className="party-subnote">{expense.items[0].name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="amount-col">
                      ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className="category-tag">
                        {expense.category || expense.expenseDetail?.category || 'General'}
                      </span>
                    </td>
                    <td>
                      <span className={`payment-tag ${pType.toLowerCase().replace(/\s+/g, '-')}`}>
                        <span className="payment-dot"></span>
                        {pType}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button 
                          className="action-btn" 
                          title="View / Print" 
                          onClick={() => openPrintModal(expense)}
                        >
                          <Printer size={16} />
                        </button>
                        <button 
                          className="action-btn" 
                          title="Send via WhatsApp / Email" 
                          onClick={() => openSendModal(expense)}
                        >
                          <Send size={16} />
                        </button>
                        <button 
                          className="action-btn" 
                          title="Edit" 
                          onClick={() => navigate(`/expenses/daily/edit/${expense._dbId}`)}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="action-btn" 
                          title="Duplicate" 
                          onClick={() => handleDuplicate(expense)}
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          className="action-btn btn-danger" 
                          title="Delete" 
                          onClick={() => handleDelete(expense._dbId)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Print View Modal */}
      {printDoc && (
        <PrintViewModal doc={printDoc} onClose={() => setPrintDoc(null)} />
      )}

      {/* Communication Modal */}
      {sendDoc && (
        <CommunicationModal 
          isOpen={Boolean(sendDoc)} 
          onClose={() => setSendDoc(null)} 
          documentData={sendDoc}
          defaultChannel="whatsapp"
        />
      )}
    </div>
  );
};

export default DailyExpenses;
