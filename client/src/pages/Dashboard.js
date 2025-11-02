import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  FileText, DollarSign, Users, TrendingUp, 
  AlertCircle, CheckCircle, Clock 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCurrency } from '../hooks/useCurrency';
import './Dashboard.css';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard/overview');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Invoiced',
      value: formatCurrency(data?.invoiceStats?.total_invoiced || 0),
      icon: FileText,
      color: '#4f46e5',
      bgColor: '#eef2ff'
    },
    {
      title: 'Total Received',
      value: formatCurrency(data?.invoiceStats?.total_received || 0),
      icon: CheckCircle,
      color: '#10b981',
      bgColor: '#d1fae5'
    },
    {
      title: 'Outstanding',
      value: formatCurrency(data?.invoiceStats?.total_outstanding || 0),
      icon: Clock,
      color: '#f59e0b',
      bgColor: '#fef3c7'
    },
    {
      title: 'Total Customers',
      value: data?.customerCount || 0,
      icon: Users,
      color: '#8b5cf6',
      bgColor: '#f3e8ff'
    }
  ];

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <Link to="/invoices/new" className="btn btn-primary">
          <FileText size={18} />
          New Invoice
        </Link>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: stat.bgColor, color: stat.color }}>
                <Icon size={24} />
              </div>
              <div className="stat-details">
                <p className="stat-label">{stat.title}</p>
                <h3 className="stat-value">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <div className="card dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Invoice Status</h3>
          </div>
          <div className="invoice-status-grid">
            <div className="status-item">
              <div className="status-count">{data?.invoiceStats?.draft_invoices || 0}</div>
              <div className="status-label">Draft</div>
            </div>
            <div className="status-item">
              <div className="status-count">{data?.invoiceStats?.sent_invoices || 0}</div>
              <div className="status-label">Sent</div>
            </div>
            <div className="status-item">
              <div className="status-count">{data?.invoiceStats?.paid_invoices || 0}</div>
              <div className="status-label">Paid</div>
            </div>
            <div className="status-item">
              <div className="status-count" style={{ color: 'var(--danger-color)' }}>
                {data?.invoiceStats?.overdue_invoices || 0}
              </div>
              <div className="status-label">Overdue</div>
            </div>
          </div>
        </div>

        <div className="card dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Quote Status</h3>
          </div>
          <div className="invoice-status-grid">
            <div className="status-item">
              <div className="status-count">{data?.quoteStats?.draft_quotes || 0}</div>
              <div className="status-label">Draft</div>
            </div>
            <div className="status-item">
              <div className="status-count">{data?.quoteStats?.sent_quotes || 0}</div>
              <div className="status-label">Sent</div>
            </div>
            <div className="status-item">
              <div className="status-count">{data?.quoteStats?.accepted_quotes || 0}</div>
              <div className="status-label">Accepted</div>
            </div>
            <div className="status-item">
              <div className="status-count">
                ${parseFloat(data?.quoteStats?.accepted_value || 0).toLocaleString()}
              </div>
              <div className="status-label">Value</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Monthly Income</h3>
        </div>
        {data?.monthlyIncome?.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthlyIncome.reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${parseFloat(value).toLocaleString()}`} />
              <Bar dataKey="income" fill="var(--primary-color)" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center" style={{ padding: '40px', color: 'var(--text-secondary)' }}>
            No income data available
          </p>
        )}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Invoices</h3>
            <Link to="/invoices" className="btn btn-sm btn-outline">View All</Link>
          </div>
          {data?.recentInvoices?.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <Link to={`/invoices/${invoice.id}`} className="invoice-link">
                          {invoice.invoice_number}
                        </Link>
                      </td>
                      <td>{invoice.customer_name}</td>
                      <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                      <td>${parseFloat(invoice.total_amount).toLocaleString()}</td>
                      <td>
                        <span className={`badge badge-${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center" style={{ padding: '40px', color: 'var(--text-secondary)' }}>
              No invoices yet
            </p>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Outstanding Invoices</h3>
          </div>
          {data?.outstandingInvoices?.length > 0 ? (
            <div className="outstanding-list">
              {data.outstandingInvoices.map((invoice) => (
                <Link 
                  key={invoice.id} 
                  to={`/invoices/${invoice.id}`} 
                  className="outstanding-item"
                >
                  <div>
                    <div className="outstanding-number">{invoice.invoice_number}</div>
                    <div className="outstanding-customer">{invoice.customer_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="outstanding-amount">
                      ${parseFloat(invoice.amount_due).toLocaleString()}
                    </div>
                    <div className="outstanding-date">
                      Due: {new Date(invoice.due_date).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center" style={{ padding: '40px', color: 'var(--text-secondary)' }}>
              No outstanding invoices
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'paid':
      return 'success';
    case 'sent':
      return 'info';
    case 'overdue':
      return 'danger';
    case 'draft':
      return 'secondary';
    default:
      return 'secondary';
  }
};

export default Dashboard;



