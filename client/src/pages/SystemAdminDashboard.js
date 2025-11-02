import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  Building2, Users, FileText, DollarSign, Activity, 
  CheckCircle, XCircle, Clock, TrendingUp, Settings,
  Eye, Power, Edit2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const SystemAdminDashboard = () => {
  const [companies, setCompanies] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    subscriptionStatus: 'all',
    search: ''
  });

  useEffect(() => {
    fetchCompanies();
    fetchStatistics();
  }, [filters]);

  const fetchCompanies = async () => {
    try {
      const params = {};
      if (filters.status !== 'all') params.status = filters.status === 'active';
      if (filters.subscriptionStatus !== 'all') params.subscriptionStatus = filters.subscriptionStatus;
      if (filters.search) params.search = filters.search;

      const response = await axios.get('/api/system-admin/companies', { params });
      setCompanies(response.data);
    } catch (error) {
      toast.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/api/system-admin/statistics');
      setStatistics(response.data);
    } catch (error) {
      toast.error('Failed to fetch statistics');
    }
  };

  const handleToggleStatus = async (companyId, currentStatus) => {
    try {
      await axios.put(`/api/system-admin/companies/${companyId}/status`, {
        isActive: !currentStatus
      });
      toast.success(`Company ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchCompanies();
      fetchStatistics();
    } catch (error) {
      toast.error('Failed to update company status');
    }
  };

  const handleUpdateSubscription = async (companyId, subscriptionData) => {
    try {
      await axios.put(`/api/system-admin/companies/${companyId}/subscription`, subscriptionData);
      toast.success('Subscription updated successfully');
      fetchCompanies();
      setSelectedCompany(null);
    } catch (error) {
      toast.error('Failed to update subscription');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'suspended': return 'danger';
      case 'cancelled': return 'secondary';
      default: return 'secondary';
    }
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">System Administration</h1>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}>
              <Building2 size={24} />
            </div>
            <div className="stat-details">
              <p className="stat-label">Total Companies</p>
              <h3 className="stat-value">{statistics.overview?.total_companies || 0}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#d1fae5', color: '#10b981' }}>
              <CheckCircle size={24} />
            </div>
            <div className="stat-details">
              <p className="stat-label">Active Companies</p>
              <h3 className="stat-value">{statistics.overview?.active_companies || 0}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}>
              <Clock size={24} />
            </div>
            <div className="stat-details">
              <p className="stat-label">Inactive Companies</p>
              <h3 className="stat-value">{statistics.overview?.inactive_companies || 0}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#dbeafe', color: '#3b82f6' }}>
              <Users size={24} />
            </div>
            <div className="stat-details">
              <p className="stat-label">Total Users</p>
              <h3 className="stat-value">{statistics.overview?.total_users || 0}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fce7f3', color: '#ec4899' }}>
              <FileText size={24} />
            </div>
            <div className="stat-details">
              <p className="stat-label">Total Invoices</p>
              <h3 className="stat-value">{statistics.overview?.total_invoices || 0}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#d1fae5', color: '#10b981' }}>
              <DollarSign size={24} />
            </div>
            <div className="stat-details">
              <p className="stat-label">Total Revenue</p>
              <h3 className="stat-value">
                ${parseFloat(statistics.overview?.total_revenue || 0).toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-2">
        {statistics?.monthlyGrowth && statistics.monthlyGrowth.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Monthly Growth</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statistics.monthlyGrowth.reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="companies_created" fill="#4f46e5" name="Companies Created" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {statistics?.subscriptionBreakdown && statistics.subscriptionBreakdown.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Subscription Breakdown</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statistics.subscriptionBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {statistics.subscriptionBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Companies</h3>
        </div>

        <div className="grid grid-3" style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-control"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Subscription</label>
            <select
              className="form-control"
              value={filters.subscriptionStatus}
              onChange={(e) => setFilters({ ...filters, subscriptionStatus: e.target.value })}
            >
              <option value="all">All</option>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-control"
              placeholder="Company name or email"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </div>

        {/* Companies Table */}
        {companies.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Subscription</th>
                  <th>Users</th>
                  <th>Customers</th>
                  <th>Invoices</th>
                  <th>Revenue</th>
                  <th>Last Activity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{company.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Created: {new Date(company.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>{company.email}</td>
                    <td>
                      <span className={`badge badge-${company.is_active ? 'success' : 'danger'}`}>
                        {company.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${getStatusColor(company.subscription_status || 'trial')}`}>
                        {company.subscription_status || 'trial'}
                      </span>
                      {company.subscription_plan && (
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                          {company.subscription_plan}
                        </div>
                      )}
                    </td>
                    <td>{company.user_count || 0}</td>
                    <td>{company.customer_count || 0}</td>
                    <td>{company.invoice_count || 0}</td>
                    <td>${parseFloat(company.total_revenue || 0).toLocaleString()}</td>
                    <td>
                      {company.last_activity_at 
                        ? new Date(company.last_activity_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setSelectedCompany(company)}
                          title="View/Edit"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className={`btn btn-sm ${company.is_active ? 'btn-danger' : 'btn-secondary'}`}
                          onClick={() => handleToggleStatus(company.id, company.is_active)}
                          title={company.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <Power size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">No companies found</div>
          </div>
        )}
      </div>

      {/* Company Detail Modal */}
      {selectedCompany && (
        <div className="modal-overlay" onClick={() => setSelectedCompany(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Company: {selectedCompany.name}</h2>
              <button onClick={() => setSelectedCompany(null)} className="btn btn-sm">×</button>
            </div>
            <div className="modal-body">
              <CompanySubscriptionForm
                company={selectedCompany}
                onSave={(data) => handleUpdateSubscription(selectedCompany.id, data)}
                onCancel={() => setSelectedCompany(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CompanySubscriptionForm = ({ company, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    subscriptionStatus: company.subscription_status || 'trial',
    subscriptionPlan: company.subscription_plan || 'basic',
    subscriptionStartDate: company.subscription_start_date || '',
    subscriptionEndDate: company.subscription_end_date || '',
    subscriptionAmount: company.subscription_amount || 0,
    maxUsers: company.max_users || 5,
    maxStorageMb: company.max_storage_mb || 1000
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Subscription Status *</label>
          <select
            name="subscriptionStatus"
            className="form-control"
            value={formData.subscriptionStatus}
            onChange={handleChange}
            required
          >
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Subscription Plan *</label>
          <select
            name="subscriptionPlan"
            className="form-control"
            value={formData.subscriptionPlan}
            onChange={handleChange}
            required
          >
            <option value="basic">Basic ($29.99/mo)</option>
            <option value="premium">Premium ($79.99/mo)</option>
            <option value="enterprise">Enterprise ($199.99/mo)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input
            type="date"
            name="subscriptionStartDate"
            className="form-control"
            value={formData.subscriptionStartDate}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">End Date</label>
          <input
            type="date"
            name="subscriptionEndDate"
            className="form-control"
            value={formData.subscriptionEndDate}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="grid grid-3">
        <div className="form-group">
          <label className="form-label">Monthly Amount</label>
          <input
            type="number"
            name="subscriptionAmount"
            className="form-control"
            value={formData.subscriptionAmount}
            onChange={handleChange}
            min="0"
            step="0.01"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Max Users</label>
          <input
            type="number"
            name="maxUsers"
            className="form-control"
            value={formData.maxUsers}
            onChange={handleChange}
            min="1"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Max Storage (MB)</label>
          <input
            type="number"
            name="maxStorageMb"
            className="form-control"
            value={formData.maxStorageMb}
            onChange={handleChange}
            min="100"
          />
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Update Subscription
        </button>
      </div>
    </form>
  );
};

export default SystemAdminDashboard;



