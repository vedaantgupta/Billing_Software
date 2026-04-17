import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit, Trash2, MoreVertical, FileText, Printer, ChevronDown } from 'lucide-react';
import { getItems, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './DailyExpenses.css';

const DailyExpenses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  const fetchExpenses = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getItems('dailyExpenses', user.id);
      setExpenses(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      const success = await deleteItem('dailyExpenses', id, user.id);
      if (success) {
        setExpenses(expenses.filter(e => e._dbId !== id));
      }
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(expenses.map(e => e._dbId));
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

  const filteredExpenses = expenses.filter(exp => 
    exp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.expenseNo?.toString().includes(searchTerm) ||
    exp.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="expenses-page">
      <div className="page-header">
        <div className="header-info">
          <h1>Daily Expenses</h1>
          <p>Track and manage your daily business expenditures</p>
        </div>
        <button className="btn btn-primary btn-with-icon" onClick={() => navigate('/expenses/daily/new')}>
          <Plus size={18} /> Add New Expense
        </button>
      </div>

      <div className="table-controls glass">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by title, expense no or category..." 
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
                <input type="checkbox" onChange={handleSelectAll} checked={selectedItems.length === expenses.length && expenses.length > 0} />
              </th>
              <th>Expense No</th>
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
                  <p>Loading expenses...</p>
                </td>
              </tr>
            ) : filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-5">
                  <div className="empty-state">
                    <FileText size={48} />
                    <p>No expenses found. Start by adding a new one!</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((expense) => (
                <tr key={expense._dbId}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedItems.includes(expense._dbId)} 
                      onChange={() => handleSelectItem(expense._dbId)}
                    />
                  </td>
                  <td>{expense.expenseNo}</td>
                  <td>
                    <div className="expense-title">
                      {expense.title || expense.msName}
                    </div>
                  </td>
                  <td>
                    <span className="amount-cell">
                      ₹{parseFloat(expense.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td>
                    <span className="category-badge">{expense.category || 'General'}</span>
                  </td>
                  <td>{new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}</td>
                  <td>
                    <span className={`payment-badge ${expense.paymentType?.toLowerCase()}`}>
                      {expense.paymentType}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="action-buttons">
                      <button className="action-btn view" title="View / Print">
                        <Eye size={16} /> View / Print
                      </button>
                      <button className="action-btn edit" title="Edit" onClick={() => navigate(`/expenses/daily/edit/${expense._dbId}`)}>
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

export default DailyExpenses;
