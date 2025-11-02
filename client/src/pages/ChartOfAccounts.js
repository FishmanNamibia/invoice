import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';

const ChartOfAccounts = () => {
  const { token } = useAuth();
  const { formatCurrency } = useCurrency();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    account_type: 'Asset',
    account_category: '',
    parent_account_id: '',
    description: '',
    opening_balance: 0
  });

  useEffect(() => {
    fetchAccounts();
  }, [filterType]);

  const fetchAccounts = async () => {
    try {
      const params = filterType ? { type: filterType } : {};
      const response = await axios.get('/api/chart-of-accounts', { params });
      setAccounts(response.data);
    } catch (error) {
      toast.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        opening_balance: parseFloat(formData.opening_balance) || 0,
        parent_account_id: formData.parent_account_id || null
      };
      
      if (editingAccount) {
        await axios.put(`/api/chart-of-accounts/${editingAccount.id}`, payload);
        toast.success('Account updated successfully');
      } else {
        await axios.post('/api/chart-of-accounts', payload);
        toast.success('Account created successfully');
      }
      fetchAccounts();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      account_category: account.account_category || '',
      parent_account_id: account.parent_account_id || '',
      description: account.description || '',
      opening_balance: account.opening_balance || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await axios.delete(`/api/chart-of-accounts/${id}`);
        toast.success('Account deleted successfully');
        fetchAccounts();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete account');
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAccount(null);
    setFormData({
      account_code: '',
      account_name: '',
      account_type: 'Asset',
      account_category: '',
      parent_account_id: '',
      description: '',
      opening_balance: 0
    });
  };

  const accountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
  
  const groupedAccounts = accounts.reduce((acc, account) => {
    const type = account.account_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(account);
    return acc;
  }, {});


  const getAccountTypeColor = (type) => {
    const colors = {
      Asset: 'bg-blue-100 text-blue-800',
      Liability: 'bg-red-100 text-red-800',
      Equity: 'bg-green-100 text-green-800',
      Revenue: 'bg-purple-100 text-purple-800',
      Expense: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="card">
          <p>Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Chart of Accounts</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> New Account
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header">
          <h3 className="card-title">Filters</h3>
        </div>
        <div className="card-body">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="form-control"
            style={{ maxWidth: '300px' }}
          >
            <option value="">All Account Types</option>
            {accountTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Accounts by Type */}
      {Object.keys(groupedAccounts).map(type => (
        <div key={type} className="card mb-4">
          <div className="card-header">
            <h3 className="card-title">
              <span className={`badge ${getAccountTypeColor(type)}`} style={{ marginRight: '10px' }}>
                {type}
              </span>
              Accounts
            </h3>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Account Code</th>
                  <th>Account Name</th>
                  <th>Category</th>
                  <th>Parent Account</th>
                  <th style={{ textAlign: 'right' }}>Opening Balance</th>
                  <th style={{ textAlign: 'right' }}>Current Balance</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedAccounts[type].map(account => (
                  <tr key={account.id}>
                    <td><strong>{account.account_code}</strong></td>
                    <td>{account.account_name}</td>
                    <td>{account.account_category || '-'}</td>
                    <td>{account.parent_account_name || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(account.opening_balance)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>{formatCurrency(account.current_balance)}</strong>
                    </td>
                    <td>
                      <span className={`badge ${account.is_active ? 'bg-success' : 'bg-secondary'}`}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEdit(account)}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        {!account.is_system_account && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(account.id)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {accounts.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <FileText size={48} />
            <h3>No accounts found</h3>
            <p>Create your first account to get started</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={20} /> Create Account
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAccount ? 'Edit Account' : 'New Account'}</h2>
              <button className="btn-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Account Code *</label>
                  <input
                    type="text"
                    name="account_code"
                    value={formData.account_code}
                    onChange={handleChange}
                    className="form-control"
                    required
                    disabled={!!editingAccount}
                  />
                </div>

                <div className="form-group">
                  <label>Account Name *</label>
                  <input
                    type="text"
                    name="account_name"
                    value={formData.account_name}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Account Type *</label>
                  <select
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleChange}
                    className="form-control"
                    required
                    disabled={!!editingAccount}
                  >
                    {accountTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Account Category</label>
                  <input
                    type="text"
                    name="account_category"
                    value={formData.account_category}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="e.g., Cash, Accounts Receivable, etc."
                  />
                </div>

                <div className="form-group">
                  <label>Parent Account</label>
                  <select
                    name="parent_account_id"
                    value={formData.parent_account_id}
                    onChange={handleChange}
                    className="form-control"
                  >
                    <option value="">None (Main Account)</option>
                    {accounts
                      .filter(acc => acc.id !== editingAccount?.id && acc.account_type === formData.account_type)
                      .map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_code} - {acc.account_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Opening Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    name="opening_balance"
                    value={formData.opening_balance}
                    onChange={handleChange}
                    className="form-control"
                    disabled={!!editingAccount}
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="form-control"
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAccount ? 'Update' : 'Create'} Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartOfAccounts;

