import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, Trash2 } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';

const Payments = () => {
  const { formatCurrency } = useCurrency();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await axios.get('/api/payments');
      setPayments(response.data);
    } catch (error) {
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment? This will update associated invoices.')) {
      try {
        await axios.delete(`/api/payments/${id}`);
        toast.success('Payment deleted successfully');
        fetchPayments();
      } catch (error) {
        toast.error('Failed to delete payment');
      }
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <Link to="/payments/new" className="btn btn-primary">
          <Plus size={18} /> Record Payment
        </Link>
      </div>

      <div className="card">
        {payments.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Payment #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td style={{ fontWeight: 600 }}>
                      {payment.payment_number || `PAY-${payment.id.substr(0, 8)}`}
                    </td>
                    <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                    <td>{payment.customer_name}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success-color)' }}>
                      {formatCurrency(payment.amount)}
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {payment.payment_method || 'N/A'}
                      </span>
                    </td>
                    <td>{payment.reference_number || '-'}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(payment.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">No payments recorded</div>
            <div className="empty-state-text">
              Start recording payments to track your income
            </div>
            <Link to="/payments/new" className="btn btn-primary">
              <Plus size={18} /> Record Payment
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;



