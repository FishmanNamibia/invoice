import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2, Filter, CheckCircle, XCircle, DollarSign, TrendingUp } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';

const Expenses = () => {
  const { formatCurrency } = useCurrency();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchSummary();
  }, [filter, categoryFilter]);

  const fetchExpenses = async () => {
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (categoryFilter) params.category_id = categoryFilter;
      
      const response = await axios.get('/api/expenses', { params });
      setExpenses(response.data.expenses || response.data);
    } catch (error) {
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/expenses/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get('/api/expenses/analytics/summary');
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await axios.delete(`/api/expenses/${id}`);
        toast.success('Expense deleted successfully');
        fetchExpenses();
        fetchSummary();
      } catch (error) {
        toast.error('Failed to delete expense');
      }
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.post(`/api/expenses/${id}/approve`);
      toast.success('Expense approved successfully');
      fetchExpenses();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to approve expense');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'badge badge-warning', icon: XCircle },
      approved: { class: 'badge badge-success', icon: CheckCircle },
      paid: { class: 'badge badge-info', icon: CheckCircle },
      rejected: { class: 'badge badge-danger', icon: XCircle }
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={badge.class} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Icon size={12} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Expenses</h1>
        <button
          onClick={() => {
            setEditingExpense(null);
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={18} /> Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-4 mb-4">
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Expenses</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {formatCurrency(summary.total_amount || 0)}
                  </div>
                </div>
                <DollarSign className="text-primary" size={24} />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Pending</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning-color)' }}>
                    {formatCurrency(summary.pending_amount || 0)}
                  </div>
                </div>
                <XCircle className="text-warning" size={24} />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Approved</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-color)' }}>
                    {formatCurrency(summary.approved_amount || 0)}
                  </div>
                </div>
                <CheckCircle className="text-success" size={24} />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Count</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {summary.total_expenses || 0}
                  </div>
                </div>
                <TrendingUp className="text-secondary" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={20} style={{ color: 'var(--text-secondary)' }} />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="form-control"
                style={{ width: 'auto', minWidth: '150px' }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-control"
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Expenses</h3>
        </div>
        <div className="card-body">
          {expenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No expenses found
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Expense #</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td style={{ fontWeight: 600 }}>{expense.expense_number}</td>
                      <td>{expense.description}</td>
                      <td>{expense.category_name || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(expense.amount)}</td>
                      <td>{new Date(expense.expense_date).toLocaleDateString()}</td>
                      <td>{getStatusBadge(expense.status)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setEditingExpense(expense);
                              setShowModal(true);
                            }}
                            className="btn btn-sm btn-outline"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          {expense.status === 'pending' && (
                            <button
                              onClick={() => handleApprove(expense.id)}
                              className="btn btn-sm btn-success"
                              title="Approve"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="btn btn-sm btn-danger"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Expense Modal */}
      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          categories={categories}
          onClose={() => {
            setShowModal(false);
            setEditingExpense(null);
          }}
          onSave={() => {
            fetchExpenses();
            fetchSummary();
            setShowModal(false);
            setEditingExpense(null);
          }}
        />
      )}
    </div>
  );
};

// Expense Modal Component
const ExpenseModal = ({ expense, categories, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    category_id: expense?.category_id || '',
    description: expense?.description || '',
    amount: expense?.amount || '',
    expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
    payment_method: expense?.payment_method || 'bank_transfer',
    is_billable: expense?.is_billable || false,
    is_reimbursable: expense?.is_reimbursable || false,
    notes: expense?.notes || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (expense) {
        await axios.put(`/api/expenses/${expense.id}`, formData);
        toast.success('Expense updated successfully');
      } else {
        await axios.post('/api/expenses', formData);
        toast.success('Expense created successfully');
      }
      onSave();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save expense');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="btn btn-sm">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="form-control"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="form-control"
              >
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.is_billable}
                  onChange={(e) => setFormData({ ...formData, is_billable: e.target.checked })}
                />
                <span>Billable</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.is_reimbursable}
                  onChange={(e) => setFormData({ ...formData, is_reimbursable: e.target.checked })}
                />
                <span>Reimbursable</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-control"
                rows="3"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {expense ? 'Update' : 'Create'} Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Expenses;
