import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, Eye, Edit2, Trash2, FileText, Mail } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';

const Quotes = () => {
  const { formatCurrency } = useCurrency();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState({
    status: 'all',
    type: 'all',
    keyword: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchQuotes();
  }, [filter]);

  const fetchQuotes = async () => {
    try {
      const params = {};
      if (filter.status !== 'all') params.status = filter.status;
      if (filter.type !== 'all') params.type = filter.type;
      if (filter.keyword) params.keyword = filter.keyword;
      if (filter.startDate) params.startDate = filter.startDate;
      if (filter.endDate) params.endDate = filter.endDate;
      
      const response = await axios.get('/api/quotes', { params });
      setQuotes(response.data);
    } catch (error) {
      toast.error('Failed to fetch quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quote?')) {
      try {
        await axios.delete(`/api/quotes/${id}`);
        toast.success('Quote deleted successfully');
        fetchQuotes();
      } catch (error) {
        toast.error('Failed to delete quote');
      }
    }
  };

  const handleSendEmail = async (quote) => {
    try {
      const quoteUrl = `${window.location.origin}/quotes/${quote.id}`;
      await axios.post(`/api/quotes/${quote.id}/send-email`, {
        to: quote.customer_email,
        quoteUrl
      });
      toast.success('Quote sent via email successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send quote email');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'sent':
        return 'info';
      case 'rejected':
        return 'danger';
      case 'expired':
        return 'warning';
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
        <h1 className="page-title">Quotes</h1>
        <Link to="/quotes/new" className="btn btn-primary">
          <Plus size={18} /> New Quote
        </Link>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Quotes</h3>
          <div className="flex gap-1" style={{ flexWrap: 'wrap', marginTop: '16px' }}>
            <input
              type="text"
              placeholder="Keyword: Customer, Quote #, Item"
              className="form-control"
              style={{ width: '200px' }}
              value={filter.keyword}
              onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
            />
            <select
              className="form-control"
              style={{ width: '150px' }}
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            >
              <option value="all">All Types</option>
              <option value="quote">Quote</option>
              <option value="estimate">Estimate</option>
            </select>
            <select
              className="form-control"
              style={{ width: '120px' }}
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
            <input
              type="date"
              className="form-control"
              style={{ width: '150px' }}
              placeholder="Start Date"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
            />
            <input
              type="date"
              className="form-control"
              style={{ width: '150px' }}
              placeholder="End Date"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
            />
            <button className="btn btn-primary" onClick={fetchQuotes}>
              Search
            </button>
          </div>
        </div>
        
        {quotes.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Quote #</th>
                  <th>Type</th>
                  <th>Customer</th>
                  <th>Salesperson</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id}>
                    <td>{new Date(quote.quote_date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                      {quote.quote_number}
                    </td>
                    <td>
                      <span className={`badge badge-${quote.quote_type === 'estimate' ? 'info' : 'secondary'}`}>
                        {quote.quote_type || 'quote'}
                      </span>
                    </td>
                    <td>{quote.customer_name}</td>
                    <td>{quote.salesperson || '-'}</td>
                    <td>{formatCurrency(quote.total_amount)}</td>
                    <td>
                      <span className={`badge badge-${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td>
                      {quote.sent_at ? (
                        <span style={{ color: 'var(--success-color)' }}>✓ Sent</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Not Sent</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Link
                          to={`/quotes/${quote.id}`}
                          className="btn btn-sm btn-outline"
                          title="View"
                        >
                          <Eye size={14} />
                        </Link>
                        <Link
                          to={`/quotes/${quote.id}/edit`}
                          className="btn btn-sm btn-outline"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </Link>
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleSendEmail(quote)}
                          title="Send Quote via Email"
                        >
                          <Mail size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(quote.id)}
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
            <div className="empty-state-title">No quotes found</div>
            <div className="empty-state-text">
              Create your first quote to get started
            </div>
            <Link to="/quotes/new" className="btn btn-primary">
              <Plus size={18} /> New Quote
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quotes;



