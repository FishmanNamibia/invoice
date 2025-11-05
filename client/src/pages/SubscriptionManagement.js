import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Mail, DollarSign, Calendar, AlertTriangle, CheckCircle, Send, Users, TrendingUp, Plus, Edit2, Trash2, Building2, Eye } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';

const SubscriptionManagement = () => {
  const { formatCurrency } = useCurrency();
  const [companies, setCompanies] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  useEffect(() => {
    fetchCompanies();
    fetchPlans();
    fetchReminders();
    fetchDashboard();
  }, [filter]);

  const fetchCompanies = async () => {
    try {
      // Fetch all companies with their subscription info
      const response = await axios.get('/api/system-admin/companies');
      const companiesData = response.data;
      
      // Fetch subscription for each company
      const companiesWithSubscriptions = await Promise.all(
        companiesData.map(async (company) => {
          try {
            const subResponse = await axios.get(`/api/subscriptions/company/${company.id}`);
            return {
              ...company,
              subscription: subResponse.data
            };
          } catch (error) {
            // No subscription found
            return {
              ...company,
              subscription: null
            };
          }
        })
      );
      
      setCompanies(companiesWithSubscriptions);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Access denied. System admin only.');
      } else {
        toast.error('Failed to fetch companies');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await axios.get('/api/subscriptions/plans');
      setSubscriptionPlans(response.data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const fetchReminders = async () => {
    try {
      const response = await axios.get('/api/subscriptions/payment-reminders');
      setReminders(response.data.reminders || response.data);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await axios.get('/api/subscriptions/dashboard/overdue');
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  };

  const handleCreateSubscription = async (companyId, subscriptionData) => {
    try {
      await axios.post(`/api/subscriptions/companies/${companyId}/subscribe`, subscriptionData);
      toast.success('Subscription created successfully');
      fetchCompanies();
      fetchDashboard();
      
      // Send welcome email notification
      try {
        const company = companies.find(c => c.id === companyId);
        if (company && company.email) {
          await axios.post(`/api/subscriptions/payment-reminders/send/${companyId}`, {
            reminder_type: 'upcoming',
            message: `Welcome! Your subscription has been activated.`
          });
        }
      } catch (e) {
        console.error('Failed to send welcome email:', e);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create subscription');
    }
  };

  const handleUpdateSubscription = async (subscriptionId, updates) => {
    try {
      // Find company with this subscription
      const company = companies.find(c => c.subscription?.id === subscriptionId);
      const subscription = company?.subscription || selectedSubscription;
      const companyId = company?.id || subscription?.company_id;
      
      if (!companyId) {
        toast.error('Company ID not found');
        return;
      }
      
      await axios.put(`/api/subscriptions/companies/${companyId}/subscription`, updates);
      toast.success('Subscription updated successfully');
      
      // Send notification based on status change
      if (updates.status) {
        const company = companies.find(c => c.id === companyId);
        if (company && company.email) {
          let reminderType = 'upcoming';
          let message = '';
          
          if (updates.status === 'suspended' || updates.status === 'cancelled') {
            reminderType = 'final';
            message = `Your subscription has been ${updates.status}. Please contact support to reactivate.`;
          } else if (updates.status === 'active') {
            message = `Your subscription has been activated. Welcome back!`;
          } else if (updates.status === 'past_due') {
            reminderType = 'overdue';
            message = `Your subscription payment is now overdue. Please update your payment method.`;
          }
          
          if (message) {
            try {
              await axios.post(`/api/subscriptions/payment-reminders/send/${companyId}`, {
                reminder_type: reminderType,
                message: message
              });
            } catch (e) {
              console.error('Failed to send notification:', e);
            }
          }
        }
      }
      
      fetchCompanies();
      fetchDashboard();
      fetchReminders();
      setShowSubscriptionModal(false);
      setSelectedSubscription(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update subscription');
    }
  };

  const handleDeleteSubscription = async (subscriptionId, companyId) => {
    if (window.confirm('Are you sure you want to delete this subscription? This action cannot be undone.')) {
      try {
        await axios.put(`/api/subscriptions/companies/${companyId}/subscription`, {
          status: 'cancelled',
          end_date: new Date().toISOString().split('T')[0]
        });
        toast.success('Subscription cancelled successfully');
        
        // Send cancellation notification
        const company = companies.find(c => c.id === companyId);
        if (company && company.email) {
          try {
            await axios.post(`/api/subscriptions/payment-reminders/send/${companyId}`, {
              reminder_type: 'final',
              message: 'Your subscription has been cancelled. We hope to serve you again in the future.'
            });
          } catch (e) {
            console.error('Failed to send cancellation email:', e);
          }
        }
        
        fetchCompanies();
        fetchDashboard();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to cancel subscription');
      }
    }
  };

  const handleSendReminder = async (companyId, reminderType) => {
    try {
      await axios.post(`/api/subscriptions/payment-reminders/send/${companyId}`, {
        reminder_type: reminderType,
        message: ''
      });
      toast.success('Payment reminder sent successfully');
      fetchReminders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send reminder');
    }
  };

  const handleSendBulkReminders = async (reminderType) => {
    if (window.confirm(`Send ${reminderType} reminders to all eligible companies?`)) {
      try {
        const response = await axios.post('/api/subscriptions/payment-reminders/send-bulk', {
          reminder_type: reminderType
        });
        toast.success(`Bulk reminders sent: ${response.data.total_sent} successful, ${response.data.total_failed} failed`);
        fetchReminders();
        fetchDashboard();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to send bulk reminders');
      }
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      trial: { class: 'badge badge-info', label: 'Trial' },
      active: { class: 'badge badge-success', label: 'Active' },
      past_due: { class: 'badge badge-warning', label: 'Past Due' },
      suspended: { class: 'badge badge-danger', label: 'Suspended' },
      cancelled: { class: 'badge badge-secondary', label: 'Cancelled' },
      expired: { class: 'badge badge-danger', label: 'Expired' }
    };
    const badge = badges[status] || badges.active;
    return <span className={badge.class}>{badge.label}</span>;
  };

  const getCompanyStatusBadge = (isActive) => {
    return isActive ? (
      <span className="badge badge-success">Active</span>
    ) : (
      <span className="badge badge-secondary">Inactive</span>
    );
  };

  const isOverdue = (nextBillingDate) => {
    if (!nextBillingDate) return false;
    return new Date(nextBillingDate) < new Date();
  };

  const getSuggestedAction = (subscription) => {
    if (!subscription) return null;
    
    if (subscription.status === 'past_due') {
      return {
        action: 'Send Overdue Reminder',
        type: 'overdue',
        icon: AlertTriangle,
        color: 'warning'
      };
    }
    
    if (isOverdue(subscription.next_billing_date)) {
      return {
        action: 'Send Final Notice',
        type: 'final',
        icon: AlertTriangle,
        color: 'danger'
      };
    }
    
    if (subscription.status === 'trial' && new Date(subscription.trial_ends_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      return {
        action: 'Send Trial Ending Reminder',
        type: 'upcoming',
        icon: Calendar,
        color: 'info'
      };
    }
    
    return null;
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  // Filter companies based on subscription status
  const filteredCompanies = companies.filter(company => {
    if (filter === 'all') return true;
    if (filter === 'no_subscription') return !company.subscription;
    return company.subscription?.status === filter;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Subscription Management</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              setSelectedCompany(null);
              setShowCompanyModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={18} /> Assign Subscription
          </button>
          <button
            onClick={() => handleSendBulkReminders('upcoming')}
            className="btn btn-info"
          >
            <Send size={18} /> Send Upcoming Reminders
          </button>
          <button
            onClick={() => handleSendBulkReminders('overdue')}
            className="btn btn-warning"
          >
            <Send size={18} /> Send Overdue Reminders
          </button>
        </div>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-4 mb-4">
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Upcoming (7 days)</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--info-color)' }}>
                    {dashboard.upcoming_count || 0}
                  </div>
                </div>
                <Calendar className="text-info" size={24} />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Overdue (1-7 days)</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning-color)' }}>
                    {dashboard.overdue_count || 0}
                  </div>
                </div>
                <AlertTriangle className="text-warning" size={24} />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Critical (7+ days)</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--danger-color)' }}>
                    {dashboard.critical_count || 0}
                  </div>
                </div>
                <AlertTriangle className="text-danger" size={24} />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Overdue Amount</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {formatCurrency(dashboard.overdue_amount || 0)}
                  </div>
                </div>
                <DollarSign className="text-secondary" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-4 mb-4">
        <div className="card">
          <div className="card-body">
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Companies</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {companies.length}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>With Subscription</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-color)' }}>
              {companies.filter(c => c.subscription).length}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Active Subscriptions</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-color)' }}>
              {companies.filter(c => c.subscription?.status === 'active').length}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Trial Subscriptions</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--info-color)' }}>
              {companies.filter(c => c.subscription?.status === 'trial').length}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-control"
            style={{ width: 'auto', minWidth: '200px' }}
          >
            <option value="all">All Companies</option>
            <option value="no_subscription">No Subscription</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Companies Table */}
      <div className="card mb-4">
        <div className="card-header">
          <h3 className="card-title">All Companies & Subscriptions</h3>
        </div>
        <div className="card-body">
          {filteredCompanies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No companies found
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Company Status</th>
                    <th>Subscription Plan</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Next Billing</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company) => {
                    const subscription = company.subscription;
                    const suggestedAction = getSuggestedAction(subscription);
                    
                    return (
                      <tr 
                        key={company.id} 
                        style={{ 
                          backgroundColor: subscription && isOverdue(subscription.next_billing_date) ? '#fef2f2' : 'transparent'
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{company.name}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {company.email}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '14px' }}>
                            {company.phone || '-'}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {company.city || ''} {company.country || ''}
                          </div>
                        </td>
                        <td>{getCompanyStatusBadge(company.is_active)}</td>
                        <td>
                          {subscription ? (
                            <div>
                              <div style={{ fontWeight: 600 }}>{subscription.plan_name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {formatCurrency(subscription.plan_price || subscription.amount)}/{subscription.billing_period === 'yearly' ? 'year' : subscription.billing_period === 'monthly' ? 'month' : subscription.billing_period || 'year'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>No subscription</span>
                          )}
                        </td>
                        <td>
                          {subscription ? getStatusBadge(subscription.status) : (
                            <span className="badge badge-secondary">None</span>
                          )}
                        </td>
                        <td>
                          {subscription ? (
                            <div style={{ fontWeight: 600 }}>{formatCurrency(subscription.amount)}</div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>-</span>
                          )}
                        </td>
                        <td>
                          {subscription ? (
                            <div>
                              <div>{new Date(subscription.next_billing_date).toLocaleDateString()}</div>
                              {isOverdue(subscription.next_billing_date) && (
                                <div style={{ fontSize: '12px', color: 'var(--danger-color)', fontWeight: 600 }}>
                                  {Math.floor((new Date() - new Date(subscription.next_billing_date)) / (1000 * 60 * 60 * 24))} days overdue
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>-</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {subscription ? (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedSubscription(subscription);
                                    setShowSubscriptionModal(true);
                                  }}
                                  className="btn btn-sm btn-outline"
                                  title="Edit Subscription"
                                >
                                  <Edit2 size={14} />
                                </button>
                                {suggestedAction && (
                                  <button
                                    onClick={() => handleSendReminder(company.id, suggestedAction.type)}
                                    className={`btn btn-sm btn-${suggestedAction.color}`}
                                    title={suggestedAction.action}
                                  >
                                    <Send size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedCompany(company);
                                    setShowReminderModal(true);
                                  }}
                                  className="btn btn-sm btn-primary"
                                  title="Send Reminder"
                                >
                                  <Mail size={14} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedCompany(company);
                                  setShowCompanyModal(true);
                                }}
                                className="btn btn-sm btn-primary"
                                title="Assign Subscription"
                              >
                                <Plus size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedCompany(company);
                                setShowCompanyModal(true);
                              }}
                              className="btn btn-sm btn-outline"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Reminders */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Payment Reminders</h3>
        </div>
        <div className="card-body">
          {reminders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
              No reminders sent yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {reminders.slice(0, 10).map((reminder) => (
                <div key={reminder.id} style={{ padding: '12px', backgroundColor: 'var(--light-color)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{reminder.company_name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {reminder.reminder_type} reminder sent on {new Date(reminder.sent_at).toLocaleString()}
                    </div>
                  </div>
                  <span className={reminder.status === 'sent' ? 'badge badge-success' : 'badge badge-danger'}>
                    {reminder.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Company/Subscription Modal */}
      {showCompanyModal && (
        <CompanySubscriptionModal
          company={selectedCompany}
          companies={companies}
          subscriptionPlans={subscriptionPlans}
          subscription={selectedCompany?.subscription}
          onClose={() => {
            setShowCompanyModal(false);
            setSelectedCompany(null);
          }}
          onCreate={handleCreateSubscription}
          onUpdate={handleUpdateSubscription}
          onDelete={handleDeleteSubscription}
        />
      )}

      {/* Reminder Modal */}
      {showReminderModal && selectedCompany && selectedCompany.subscription && (
        <ReminderModal
          company={selectedCompany}
          subscription={selectedCompany.subscription}
          onClose={() => {
            setShowReminderModal(false);
            setSelectedCompany(null);
          }}
          onSend={(reminderType) => {
            handleSendReminder(selectedCompany.id, reminderType);
            setShowReminderModal(false);
            setSelectedCompany(null);
          }}
        />
      )}
    </div>
  );
};

// Company Subscription Modal Component
const CompanySubscriptionModal = ({ company, companies, subscriptionPlans, subscription, onClose, onCreate, onUpdate, onDelete }) => {
  const { formatCurrency } = useCurrency();
  
  const getStatusBadge = (status) => {
    const badges = {
      trial: { class: 'badge badge-info', label: 'Trial' },
      active: { class: 'badge badge-success', label: 'Active' },
      past_due: { class: 'badge badge-warning', label: 'Past Due' },
      suspended: { class: 'badge badge-danger', label: 'Suspended' },
      cancelled: { class: 'badge badge-secondary', label: 'Cancelled' },
      expired: { class: 'badge badge-danger', label: 'Expired' }
    };
    const badge = badges[status] || badges.active;
    return <span className={badge.class}>{badge.label}</span>;
  };
  const [formData, setFormData] = useState({
    company_id: company?.id || '',
    plan_id: subscription?.plan_id || '',
    start_date: subscription?.start_date || new Date().toISOString().split('T')[0],
    payment_method: subscription?.payment_method || 'bank_transfer',
    auto_renew: subscription?.auto_renew !== undefined ? subscription.auto_renew : true,
    status: subscription?.status || 'active'
  });

  const [selectedCompany, setSelectedCompany] = useState(company);
  const [isEditing, setIsEditing] = useState(!!subscription);

  useEffect(() => {
    if (company) {
      setSelectedCompany(company);
      setFormData(prev => ({ ...prev, company_id: company.id }));
    }
  }, [company]);

  const handleCompanyChange = (companyId) => {
    const foundCompany = companies.find(c => c.id === companyId);
    setSelectedCompany(foundCompany);
    setFormData(prev => ({ ...prev, company_id: companyId }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isEditing && subscription) {
      // Update existing subscription
      await onUpdate(subscription.id, formData);
    } else {
      // Create new subscription
      if (!formData.company_id || !formData.plan_id) {
        toast.error('Please select a company and plan');
        return;
      }
      await onCreate(formData.company_id, formData);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (subscription) {
      await onUpdate(subscription.id, { 
        status: newStatus,
        ...(newStatus === 'cancelled' ? { 
          end_date: new Date().toISOString().split('T')[0],
          cancellation_reason: 'Cancelled by system administrator'
        } : {})
      });
    }
  };

  const selectedPlan = subscriptionPlans.find(p => p.id === formData.plan_id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing ? 'Edit Subscription' : 'Assign Subscription'}
          </h2>
          <button onClick={onClose} className="btn btn-sm">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {!company && (
              <div className="form-group">
                <label className="form-label">Select Company *</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className="form-control"
                  required={!isEditing}
                >
                  <option value="">Select Company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedCompany && (
              <div className="card mb-4" style={{ backgroundColor: 'var(--light-color)' }}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{selectedCompany.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedCompany.email}</div>
                      {selectedCompany.phone && (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedCompany.phone}</div>
                      )}
                    </div>
                    <span className={selectedCompany.is_active ? 'badge badge-success' : 'badge badge-secondary'}>
                      {selectedCompany.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {selectedCompany.subscription && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Current Plan: <strong>{selectedCompany.subscription.plan_name}</strong>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Status: {getStatusBadge(selectedCompany.subscription.status)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Subscription Plan *</label>
              <select
                value={formData.plan_id}
                onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                className="form-control"
                required
              >
                <option value="">Select Plan</option>
                {subscriptionPlans.map(plan => {
                  const billingPeriod = plan.billing_period === 'yearly' ? 'year' : plan.billing_period === 'monthly' ? 'month' : plan.billing_period;
                  return (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrency(plan.price)}/{billingPeriod}
                    </option>
                  );
                })}
              </select>
              {selectedPlan && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div>Max Users: {selectedPlan.max_users || 'Unlimited'}</div>
                  <div>Max Invoices: {selectedPlan.max_invoices || 'Unlimited'}</div>
                  <div>Max Customers: {selectedPlan.max_customers || 'Unlimited'}</div>
                  {selectedPlan.trial_days > 0 && (
                    <div style={{ color: 'var(--info-color)', fontWeight: 600 }}>
                      Trial Period: {selectedPlan.trial_days} days
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="form-control"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="paypal">PayPal</option>
                  <option value="stripe">Stripe</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
            </div>

            {isEditing && (
              <div className="form-group">
                <label className="form-label">Subscription Status</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('active')}
                    className={`btn btn-sm ${subscription?.status === 'active' ? 'btn-success' : 'btn-outline'}`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('trial')}
                    className={`btn btn-sm ${subscription?.status === 'trial' ? 'btn-info' : 'btn-outline'}`}
                  >
                    Trial
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('past_due')}
                    className={`btn btn-sm ${subscription?.status === 'past_due' ? 'btn-warning' : 'btn-outline'}`}
                  >
                    Past Due
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('suspended')}
                    className={`btn btn-sm ${subscription?.status === 'suspended' ? 'btn-danger' : 'btn-outline'}`}
                  >
                    Suspended
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('cancelled')}
                    className={`btn btn-sm ${subscription?.status === 'cancelled' ? 'btn-secondary' : 'btn-outline'}`}
                  >
                    Cancelled
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px' }}>
              <input
                type="checkbox"
                checked={formData.auto_renew}
                onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Auto Renew</span>
            </div>
          </div>
          <div className="modal-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div>
                {isEditing && subscription && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to cancel this subscription?')) {
                        onDelete(subscription.id, formData.company_id);
                        onClose();
                      }
                    }}
                    className="btn btn-danger"
                  >
                    <Trash2 size={16} /> Cancel Subscription
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={onClose} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Update' : 'Create'} Subscription
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Reminder Modal Component
const ReminderModal = ({ company, subscription, onClose, onSend }) => {
  const [reminderType, setReminderType] = useState('upcoming');
  const [customMessage, setCustomMessage] = useState('');

  const handleSend = () => {
    onSend(reminderType);
    toast.success('Reminder sent successfully');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Send Payment Reminder</h2>
          <button onClick={onClose} className="btn btn-sm">×</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Company:</strong> {company.name}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Email:</strong> {company.email}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Plan:</strong> {subscription.plan_name}
            </div>
            <div>
              <strong>Next Billing:</strong> {new Date(subscription.next_billing_date).toLocaleDateString()}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reminder Type</label>
            <select
              value={reminderType}
              onChange={(e) => setReminderType(e.target.value)}
              className="form-control"
            >
              <option value="upcoming">Upcoming (7 days before due)</option>
              <option value="overdue">Overdue (1-7 days after due)</option>
              <option value="final">Final Notice (7+ days after due)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Custom Message (Optional)</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="form-control"
              rows="4"
              placeholder="Leave empty to use default message"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button onClick={handleSend} className="btn btn-primary">
            <Send size={16} /> Send Reminder
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManagement;
