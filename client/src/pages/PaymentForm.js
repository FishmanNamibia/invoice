import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Save } from 'lucide-react';

const PaymentForm = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    paymentNumber: `PAY-${Date.now()}`,
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    notes: ''
  });
  const [allocations, setAllocations] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (formData.customerId) {
      fetchCustomerInvoices(formData.customerId);
    }
  }, [formData.customerId]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    }
  };

  const fetchCustomerInvoices = async (customerId) => {
    try {
      const response = await axios.get(`/api/invoices?customerId=${customerId}`);
      const unpaidInvoices = response.data.filter(
        invoice => invoice.status !== 'paid' && invoice.amount_due > 0
      );
      setInvoices(unpaidInvoices);
      setAllocations(unpaidInvoices.map(invoice => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        totalAmount: parseFloat(invoice.total_amount),
        amountDue: parseFloat(invoice.amount_due),
        amount: 0
      })));
    } catch (error) {
      toast.error('Failed to fetch invoices');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAllocationChange = (index, value) => {
    const newAllocations = [...allocations];
    const allocation = newAllocations[index];
    
    // Ensure amount doesn't exceed amount due
    const amount = Math.min(parseFloat(value) || 0, allocation.amountDue);
    newAllocations[index].amount = amount;
    
    setAllocations(newAllocations);
    
    // Update total payment amount
    const totalAmount = newAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    setFormData({
      ...formData,
      amount: totalAmount
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const activeAllocations = allocations.filter(alloc => alloc.amount > 0);
    
    if (activeAllocations.length === 0) {
      toast.error('Please allocate payment to at least one invoice');
      return;
    }

    setLoading(true);

    try {
      const data = {
        ...formData,
        allocations: activeAllocations.map(alloc => ({
          invoiceId: alloc.invoiceId,
          amount: alloc.amount
        }))
      };

      await axios.post('/api/payments', data);
      toast.success('Payment recorded successfully');
      navigate('/payments');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Record Payment</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Payment Details</h3>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Customer *</label>
              <select
                name="customerId"
                className="form-control"
                value={formData.customerId}
                onChange={handleChange}
                required
              >
                <option value="">Select Customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customer_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Number</label>
              <input
                type="text"
                name="paymentNumber"
                className="form-control"
                value={formData.paymentNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-3">
            <div className="form-group">
              <label className="form-label">Payment Date *</label>
              <input
                type="date"
                name="paymentDate"
                className="form-control"
                value={formData.paymentDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method *</label>
              <select
                name="paymentMethod"
                className="form-control"
                value={formData.paymentMethod}
                onChange={handleChange}
                required
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reference Number</label>
              <input
                type="text"
                name="referenceNumber"
                className="form-control"
                value={formData.referenceNumber}
                onChange={handleChange}
                placeholder="Transaction reference"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              name="notes"
              className="form-control"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              placeholder="Additional notes about this payment"
            />
          </div>
        </div>

        {formData.customerId && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Allocate to Invoices</h3>
            </div>

            {invoices.length > 0 ? (
              <>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Amount Due</th>
                        <th>Payment Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map((allocation, index) => (
                        <tr key={allocation.invoiceId}>
                          <td style={{ fontWeight: 600 }}>{allocation.invoiceNumber}</td>
                          <td>
                            {new Date(invoices[index]?.invoice_date).toLocaleDateString()}
                          </td>
                          <td>${allocation.totalAmount.toFixed(2)}</td>
                          <td style={{ fontWeight: 600, color: 'var(--danger-color)' }}>
                            ${allocation.amountDue.toFixed(2)}
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control"
                              value={allocation.amount}
                              onChange={(e) => handleAllocationChange(index, e.target.value)}
                              min="0"
                              max={allocation.amountDue}
                              step="0.01"
                              style={{ width: '150px' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ padding: '20px', borderTop: '2px solid var(--border-color)' }}>
                  <div style={{ maxWidth: '400px', marginLeft: 'auto' }}>
                    <div className="flex-between" style={{ fontSize: '20px', paddingTop: '12px' }}>
                      <span style={{ fontWeight: 700 }}>Total Payment Amount:</span>
                      <span style={{ fontWeight: 700, color: 'var(--success-color)' }}>
                        ${parseFloat(formData.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-text">
                  No outstanding invoices for this customer
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/payments')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !formData.customerId || allocations.filter(a => a.amount > 0).length === 0}
          >
            <Save size={18} />
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;



