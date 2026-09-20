import React, { useState } from 'react';
import { IndianRupee, Plus, AlertCircle, FileText, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';

const ProjectFinanceView = () => {
  const {
    activeProject,
    tasks,
    expenses,
    addExpense,
    projectHealth
  } = useProject();

  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Software/Tools');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState('');

  if (!activeProject) return null;

  const budget = Number(activeProject.budget) || 0;
  const totalLaborHours = tasks.reduce((sum, t) => sum + (Number(t.actualHours) || 0), 0);
  const hourlyRate = Number(activeProject.hourlyRate) || 800; // ₹800/hr
  const totalLaborCost = totalLaborHours * hourlyRate;
  const totalDirectExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalActualSpend = totalLaborCost + totalDirectExpenses;
  const remainingBudget = budget - totalActualSpend;
  const isOverBudget = remainingBudget < 0 && budget > 0;

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amt = Number(expenseAmount);
    if (!amt || !expenseTitle.trim()) return;

    await addExpense({
      title: expenseTitle.trim(),
      amount: amt,
      category: expenseCategory,
      date: expenseDate,
      notes: expenseNotes
    });

    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseNotes('');
    setIsAddingExpense(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 1.75rem' }}>
      
      {/* Financial Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div className="pm-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Planned Budget</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.4rem 0', color: '#1e293b' }}>
            ₹{budget.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rate: ₹{hourlyRate}/hr</span>
        </div>

        <div className="pm-card" style={{ borderLeft: `4px solid ${isOverBudget ? '#ef4444' : '#10b981'}` }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Actual Spend</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.4rem 0', color: isOverBudget ? '#dc2626' : '#1e293b' }}>
            ₹{totalActualSpend.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: isOverBudget ? '#dc2626' : '#10b981', fontWeight: 700 }}>
            {budget > 0 ? `${Math.round((totalActualSpend / budget) * 100)}% of budget utilized` : 'No budget set'}
          </span>
        </div>

        <div className="pm-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Labor Cost</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.4rem 0', color: '#1e293b' }}>
            ₹{totalLaborCost.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{totalLaborHours} logged hours</span>
        </div>

        <div className="pm-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Direct Expenses</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.4rem 0', color: '#1e293b' }}>
            ₹{totalDirectExpenses.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{expenses.length} logged expense items</span>
        </div>

      </div>

      {/* Overbudget Warning */}
      {isOverBudget && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} color="#dc2626" />
          <div style={{ color: '#b91c1c', fontSize: '0.875rem' }}>
            <strong>Budget Variance Alert:</strong> This project has exceeded its target budget by ₹{Math.abs(remainingBudget).toLocaleString()} ({Math.round(Math.abs(remainingBudget) / budget * 100)}% overrun).
          </div>
        </div>
      )}

      {/* Expenses Management Section */}
      <div className="pm-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Project Expenses Ledger</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Direct non-labor purchases, licenses, hosting, sub-contracts</span>
          </div>

          <button className="pm-btn pm-btn-primary pm-btn-sm" onClick={() => setIsAddingExpense(true)}>
            <Plus size={14} /> Log Expense
          </button>
        </div>

        {/* Add Expense Modal */}
        {isAddingExpense && (
          <form onSubmit={handleAddExpense} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Expense Title *</label>
                <input className="pm-search-input" placeholder="e.g. AWS Cloud Hosting or Figma Subscription" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Amount (₹) *</label>
                <input type="number" className="pm-search-input" placeholder="5000" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Category</label>
                <select className="pm-select" style={{ width: '100%' }} value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                  <option value="Software/Tools">Software/Tools</option>
                  <option value="Hosting/Infra">Hosting/Infra</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Travel">Travel</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Notes / Invoice Reference</label>
              <input className="pm-search-input" placeholder="e.g. Invoice #INV-20412" value={expenseNotes} onChange={e => setExpenseNotes(e.target.value)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button type="button" className="pm-btn pm-btn-ghost pm-btn-sm" onClick={() => setIsAddingExpense(false)}>Cancel</button>
              <button type="submit" className="pm-btn pm-btn-primary pm-btn-sm">Save Expense</button>
            </div>
          </form>
        )}

        {/* Expenses Table */}
        <table className="pm-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Date</th>
              <th>Notes</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <tr key={exp.id || exp._dbId}>
                <td style={{ fontWeight: 700 }}>{exp.title}</td>
                <td>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#f1f5f9', color: '#475569' }}>
                    {exp.category}
                  </span>
                </td>
                <td>{exp.date}</td>
                <td style={{ color: '#64748b' }}>{exp.notes || '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b' }}>
                  ₹{Number(exp.amount || 0).toLocaleString()}
                </td>
              </tr>
            ))}

            {expenses.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                  No direct expenses logged for this project yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default ProjectFinanceView;
