import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit, FileText, ChevronDown } from 'lucide-react';
import { getItems, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './OtherIncome.css';

const OtherIncome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    fetchIncomes();
  }, [user]);

  const fetchIncomes = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getItems('otherIncome', user.id);
      setIncomes(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error('Error fetching incomes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(incomes.map(e => e._dbId));
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

  const filteredIncomes = incomes.filter(inc => 
    inc.msName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inc.incomeNo?.toString().includes(searchTerm) ||
    inc.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="incomes-page">
      <div className="page-header">
        <div className="header-info">
          <h1>Other Income</h1>
          <p>Track miscellaneous business income and revenue</p>
        </div>
        <button className="btn btn-primary btn-with-icon" onClick={() => navigate('/income/other/new')}>
          <Plus size={18} /> Add New Income
        </button>
      </div>

      <div className="table-controls glass">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by title, income no or category..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-actions">
           {selectedItems.length > 0 && (
             <button className="btn btn-danger-outline btn-sm">
               Delete Selected ({selectedItems.length})
             </button>
           )}
        </div>
      </div>

      <div className="table-container glass">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" onChange={handleSelectAll} checked={selectedItems.length === incomes.length && incomes.length > 0} />
              </th>
              <th>Income No</th>
              <th>Title</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Date</th>
              <th>Payment Type</th>
              <th className="text-right">Action</th>
              <th style={{ width: '40px' }}><ChevronDown size={16} /></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-5">
                  <div className="loading-spinner"></div>
                  <p>Loading incomes...</p>
                </td>
              </tr>
            ) : filteredIncomes.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-5">
                  <div className="empty-state">
                    <FileText size={48} />
                    <p>No income records found. Start by adding a new one!</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredIncomes.map((income) => (
                <tr key={income._dbId}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedItems.includes(income._dbId)} 
                      onChange={() => handleSelectItem(income._dbId)}
                    />
                  </td>
                  <td>{income.incomeNo}</td>
                  <td>
                    <div className="income-title">
                      {income.msName}
                    </div>
                  </td>
                  <td>
                    <span className="amount-cell">
                      ₹{parseFloat(income.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td>
                    <span className="category-badge">{income.category || 'General'}</span>
                  </td>
                  <td>{new Date(income.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}</td>
                  <td>
                    <span className={`payment-badge ${income.paymentType?.toLowerCase()}`}>
                      {income.paymentType}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="action-buttons">
                      <button className="action-btn view" title="View / Print">
                        <Eye size={16} /> View / Print
                      </button>
                      <button className="action-btn edit" title="Edit" onClick={() => navigate(`/income/other/edit/${income._dbId}`)}>
                        <Edit size={16} /> Edit
                      </button>
                    </div>
                  </td>
                  <td>
                    <button className="icon-btn">
                      <ChevronDown size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OtherIncome;
