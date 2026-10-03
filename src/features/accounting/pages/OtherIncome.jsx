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
import '@/features/accounting/styles/OtherIncome.css';

const OtherIncome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  // Modals
  const [printDoc, setPrintDoc] = useState(null);
  const [sendDoc, setSendDoc] = useState(null);

  useEffect(() => {
    fetchIncomes();
  }, [user]);

  const fetchIncomes = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getItems('otherIncome', user.id);
      // Sort newest first
      setIncomes(data.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)));
    } catch (error) {
      console.error('Error fetching incomes:', error);
    } finally {
      setLoading(false);
    }
  };

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Filtered incomes list
  const filteredIncomes = useMemo(() => {
    return incomes.filter(inc => {
      // Category filter
      if (categoryFilter !== 'ALL' && (inc.category || 'General').toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      // Payment filter
      if (paymentFilter !== 'ALL' && (inc.paymentType || 'CASH').toUpperCase() !== paymentFilter.toUpperCase()) {
        return false;
      }
      // Search term
      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase();
      const titleMatch = (inc.msName || inc.title || inc.customerInfo?.ms || '').toLowerCase().includes(query);
      const noMatch = (inc.incomeNo || '').toString().toLowerCase().includes(query);
      const catMatch = (inc.category || '').toLowerCase().includes(query);
      const payMatch = (inc.paymentType || '').toLowerCase().includes(query);
      const noteMatch = (inc.items?.[0]?.note || inc.notes || '').toLowerCase().includes(query);
      return titleMatch || noMatch || catMatch || payMatch || noteMatch;
    });
  }, [incomes, searchTerm, categoryFilter, paymentFilter]);

  const totalFilteredAmount = useMemo(() => {
    return filteredIncomes.reduce((sum, e) => sum + Number(e.grandTotal || e.totalVal || e.total || e.amount || 0), 0);
  }, [filteredIncomes]);

  // Actions
  const handleDelete = async (id) => {
    if (!user?.id) return;
    if (window.confirm('Are you sure you want to permanently delete this income record?')) {
      const success = await deleteItem('otherIncome', id, user.id);
      if (success) {
        setIncomes(prev => prev.filter(e => e._dbId !== id));
        setSelectedItems(prev => prev.filter(i => i !== id));
      }
    }
  };

  const handleBulkDelete = async () => {
    if (!user?.id || selectedItems.length === 0) return;
    if (window.confirm(`Permanently delete ${selectedItems.length} selected income record(s)?`)) {
      for (const id of selectedItems) {
        await deleteItem('otherIncome', id, user.id);
      }
      setIncomes(prev => prev.filter(e => !selectedItems.includes(e._dbId)));
      setSelectedItems([]);
    }
  };

  const handleDuplicate = async (income) => {
    if (!user?.id) return;
    const nextNo = (incomes.length + 1).toString();
    const cloned = {
      ...income,
      id: undefined,
      _dbId: undefined,
      _id: undefined,
      incomeNo: nextNo,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    await addItem('otherIncome', cloned, user.id);
    await fetchIncomes();
    alert(`Income record duplicated successfully as #${nextNo}!`);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(filteredIncomes.map(e => e._dbId));
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

  const openPrintModal = (income) => {
    setPrintDoc({
      ...income,
      docType: 'Other Income',
      invoiceNumber: income.incomeNo ? `INC-${income.incomeNo}` : 'INC-1',
      customerName: income.msName || income.title || income.customerInfo?.ms || 'Income Source',
      total: income.grandTotal || income.totalVal || income.amount || 0,
      amount: income.grandTotal || income.totalVal || income.amount || 0,
      date: income.date || new Date().toISOString().split('T')[0]
    });
  };

  const openSendModal = (income) => {
    setSendDoc({
      ...income,
      docType: 'Other Income',
      invoiceNumber: income.incomeNo ? `INC-${income.incomeNo}` : 'INC-1',
      customerName: income.msName || income.title || income.customerInfo?.ms || 'Income Source',
      total: income.grandTotal || income.totalVal || income.amount || 0,
      amount: income.grandTotal || income.totalVal || income.amount || 0,
      date: income.date || new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="incomes-doc-page">
      {/* Page Header */}
      <div className="page-header print-hide">
        <div className="header-info">
          <div className="page-badge-row">
            <span className="page-badge income-badge">INCOME RECEIPTS</span>
          </div>
          <h1 className="page-title">Other Income</h1>
          <p className="page-subtitle">Track, record, and print official receipts for miscellaneous business revenues</p>
        </div>

        <div className="header-actions">
          <button 
            className="btn btn-primary income-primary-btn" 
            onClick={() => navigate('/income/other/new')}
          >
            <Plus size={18} /> Add New Income
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
              placeholder="Search source, receipt no, category or note..." 
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
              <option value="Commission & Brokerage">Commission & Brokerage</option>
              <option value="Interest Income">Interest Income</option>
              <option value="Rental Income">Rental Income</option>
              <option value="Scrap / Salvage Sale">Scrap / Salvage Sale</option>
              <option value="Discount & Rebate">Discount & Rebate</option>
              <option value="Dividends & Investments">Dividends & Investments</option>
              <option value="Refunds & Claims">Refunds & Claims</option>
              <option value="Consulting / Service Fee">Consulting / Service Fee</option>
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
          <div className="table-summary-pill income-pill">
            <span className="summary-count">{filteredIncomes.length} receipt{filteredIncomes.length !== 1 ? 's' : ''}</span>
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
                  checked={selectedItems.length === filteredIncomes.length && filteredIncomes.length > 0} 
                />
              </th>
              <th style={{ width: '130px' }}>DATE</th>
              <th style={{ width: '130px' }}>RECEIPT NO</th>
              <th>SOURCE / PAYER</th>
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
                  Loading income records...
                </td>
              </tr>
            ) : filteredIncomes.length === 0 ? (
              <tr className="empty-state-row">
                <td colSpan="8">
                  <div className="empty-state-wrapper">
                    <FileText size={44} strokeWidth={1.5} className="empty-icon" />
                    <h3 className="empty-title">No Income Records Found</h3>
                    <p className="empty-desc">
                      {searchTerm || categoryFilter !== 'ALL' || paymentFilter !== 'ALL'
                        ? 'No income records match your selected filters. Try adjusting search or filter options.' 
                        : 'Record miscellaneous business income, interest, and non-operating revenues.'}
                    </p>
                    <button 
                      className="btn btn-primary income-primary-btn" 
                      style={{ marginTop: '1rem' }} 
                      onClick={() => navigate('/income/other/new')}
                    >
                      <Plus size={16} /> Add New Income
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredIncomes.map((income) => {
                const amt = Number(income.grandTotal || income.totalVal || income.amount || 0);
                const title = income.msName || income.title || income.customerInfo?.ms || 'Income Source';
                const pType = (income.paymentType || 'CASH').toUpperCase();
                const num = income.incomeNo ? `INC-${income.incomeNo}` : 'INC-1';
                const dateStr = income.date || income.createdAt?.split('T')[0] || '-';
                const initial = title ? title.charAt(0).toUpperCase() : 'I';

                return (
                  <tr key={income._dbId || Math.random()} className={selectedItems.includes(income._dbId) ? 'row-selected' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedItems.includes(income._dbId)} 
                        onChange={() => handleSelectItem(income._dbId)}
                      />
                    </td>
                    <td className="date-col">
                      {dateStr}
                    </td>
                    <td className="number-col">
                      <span className="voucher-no-badge income-no-badge">{num}</span>
                    </td>
                    <td className="party-col">
                      <div className="party-cell-wrapper">
                        <div className="party-avatar income-avatar">{initial}</div>
                        <div>
                          <div className="party-text" title={title}>{title}</div>
                          {income.items?.[0]?.name && (
                            <div className="party-subnote">{income.items[0].name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="amount-col income-amt">
                      ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className="category-tag">
                        {income.category || income.incomeDetail?.category || 'General'}
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
                          onClick={() => openPrintModal(income)}
                        >
                          <Printer size={16} />
                        </button>
                        <button 
                          className="action-btn" 
                          title="Send via WhatsApp / Email" 
                          onClick={() => openSendModal(income)}
                        >
                          <Send size={16} />
                        </button>
                        <button 
                          className="action-btn" 
                          title="Edit" 
                          onClick={() => navigate(`/income/other/edit/${income._dbId}`)}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="action-btn" 
                          title="Duplicate" 
                          onClick={() => handleDuplicate(income)}
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          className="action-btn btn-danger" 
                          title="Delete" 
                          onClick={() => handleDelete(income._dbId)}
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

export default OtherIncome;
