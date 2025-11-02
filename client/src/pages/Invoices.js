import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, Eye, Edit2, Trash2, Filter, Mail, Bell } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';

const Invoices = () => {
  const { formatCurrency } = useCurrency();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  const fetchInvoices = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await axios.get('/api/invoices', { params });
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await axios.delete(`/api/invoices/${id}`);
        toast.success('Invoice deleted successfully');
        fetchInvoices();
      } catch (error) {
        toast.error('Failed to delete invoice');
      }
    }
  };

  const handleSendEmail = async (invoice) => {
    try {
      const invoiceUrl = `${window.location.origin}/invoices/${invoice.id}`;
      await axios.post(`/api/invoices/${invoice.id}/send-email`, {
        to: invoice.customer_email,
        invoiceUrl
      });
      toast.success('Invoice sent via email successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send invoice email');
    }
  };

  const handleSendReminder = async (invoice) => {
    try {
      await axios.post(`/api/invoices/${invoice.id}/send-reminder`, {
        to: invoice.customer_email
      });
      toast.success('Payment reminder sent successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send reminder');
    }
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

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Invoices</h1>
        <Link to="/invoices/new" className="btn btn-primary">
          <Plus size={18} /> New Invoice
        </Link>
      </div>

      <div className="card">
        <div className="card-header flex-between">
          <h3 className="card-title">All Invoices</h3>
          <div className="flex gap-1">
            <button
              className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`btn btn-sm ${filter === 'draft' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter('draft')}
            >
              Draft
            </button>
            <button
              className={`btn btn-sm ${filter === 'sent' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter('sent')}
            >
              Sent
            </button>
            <button
              className={`btn btn-sm ${filter === 'paid' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter('paid')}
            >
              Paid
            </button>
            <button
              className={`btn btn-sm ${filter === 'overdue' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter('overdue')}
            >
              Overdue
            </button>
          </div>
        </div>

        {invoices.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Total</th>
                  <th>Amount Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link
                        to={`/invoices/${invoice.id}`}
                        style={{ color: 'var(--primary-color)', fontWeight: 600 }}
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td>{invoice.customer_name}</td>
                    <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                    <td>{new Date(invoice.due_date).toLocaleDateString()}</td>
                    <td>{formatCurrency(invoice.total_amount)}</td>
                    <td>{formatCurrency(invoice.amount_due)}</td>
                    <td>
                      <span className={`badge badge-${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="btn btn-sm btn-outline"
                          title="View"
                        >
                          <Eye size={14} />
                        </Link>
                        <Link
                          to={`/invoices/${invoice.id}/edit`}
                          className="btn btn-sm btn-outline"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </Link>
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleSendEmail(invoice)}
                          title="Send Invoice via Email"
                        >
                          <Mail size={14} />
                        </button>
                        {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleSendReminder(invoice)}
                            title="Send Payment Reminder"
                          >
                            <Bell size={14} />
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(invoice.id)}
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
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">No invoices found</div>
            <div className="empty-state-text">
              Create your first invoice to get started
            </div>
            <Link to="/invoices/new" className="btn btn-primary">
              <Plus size={18} /> New Invoice
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;



