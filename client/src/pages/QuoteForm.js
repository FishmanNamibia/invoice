import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Plus, Trash2, Save } from 'lucide-react';

const QuoteForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    quoteNumber: `QUO-${Date.now()}`,
    quoteDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    notes: '',
    terms: 'Quote valid for 30 days',
    salesperson: '',
    quoteType: 'quote'
  });
  const [quoteItems, setQuoteItems] = useState([
    { itemId: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxRate: 0 }
  ]);

  useEffect(() => {
    fetchCustomers();
    fetchItems();
    if (id) {
      fetchQuote();
    }
  }, [id]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    }
  };

  const fetchItems = async () => {
    try {
      const response = await axios.get('/api/items');
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to fetch items');
    }
  };

  const fetchQuote = async () => {
    try {
      const response = await axios.get(`/api/quotes/${id}`);
      const quote = response.data;
      setFormData({
        customerId: quote.customer_id,
        quoteNumber: quote.quote_number,
        quoteDate: quote.quote_date,
        expiryDate: quote.expiry_date,
        status: quote.status,
        notes: quote.notes || '',
        terms: quote.terms || '',
        salesperson: quote.salesperson || '',
        quoteType: quote.quote_type || 'quote'
      });
      if (quote.items && quote.items.length > 0) {
        setQuoteItems(quote.items.map(item => ({
          itemId: item.item_id || '',
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unit_price),
          discountPercent: parseFloat(item.discount_percent),
          taxRate: parseFloat(item.tax_rate)
        })));
      }
    } catch (error) {
      toast.error('Failed to fetch quote');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...quoteItems];
    newItems[index][field] = value;
    
    if (field === 'itemId' && value) {
      const selectedItem = items.find(item => item.id === value);
      if (selectedItem) {
        newItems[index].description = selectedItem.item_name;
        newItems[index].unitPrice = parseFloat(selectedItem.unit_price);
        newItems[index].taxRate = parseFloat(selectedItem.tax_rate || 0);
      }
    }
    
    setQuoteItems(newItems);
  };

  const addItem = () => {
    setQuoteItems([
      ...quoteItems,
      { itemId: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxRate: 0 }
    ]);
  };

  const removeItem = (index) => {
    if (quoteItems.length > 1) {
      setQuoteItems(quoteItems.filter((_, i) => i !== index));
    }
  };

  const calculateLineTotal = (item) => {
    const subtotal = item.quantity * item.unitPrice;
    const discount = subtotal * (item.discountPercent / 100);
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * (item.taxRate / 100);
    return afterDiscount + tax;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    quoteItems.forEach(item => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const discount = lineSubtotal * (item.discountPercent / 100);
      const afterDiscount = lineSubtotal - discount;
      const tax = afterDiscount * (item.taxRate / 100);

      subtotal += lineSubtotal;
      totalDiscount += discount;
      totalTax += tax;
    });

    const total = subtotal - totalDiscount + totalTax;

    return { subtotal, totalDiscount, totalTax, total };
  };

  const handleSubmit = async (e, action = 'save') => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        items: quoteItems
      };

      let quoteId = id;
      if (id) {
        const response = await axios.put(`/api/quotes/${id}`, data);
        quoteId = response.data.id || id;
        toast.success('Quote updated successfully');
      } else {
        const response = await axios.post('/api/quotes', data);
        quoteId = response.data.id;
        toast.success('Quote created successfully');
      }

      // Handle different actions
      if (action === 'save') {
        navigate('/quotes');
      } else if (action === 'email') {
        const quoteUrl = `${window.location.origin}/quotes/${quoteId}`;
        await axios.post(`/api/quotes/${quoteId}/send-email`, {
          quoteUrl
        });
        toast.success('Quote sent via email successfully');
        navigate('/quotes');
      } else if (action === 'print') {
        navigate(`/quotes/${quoteId}`);
        setTimeout(() => window.print(), 500);
      } else if (action === 'preview') {
        navigate(`/quotes/${quoteId}`);
      } else if (action === 'convert') {
        navigate(`/invoices/new?fromQuote=${quoteId}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{id ? 'Edit Quote' : 'New Quote'}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quote Details</h3>
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
              <label className="form-label">Quote Number *</label>
              <input
                type="text"
                name="quoteNumber"
                className="form-control"
                value={formData.quoteNumber}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-3">
            <div className="form-group">
              <label className="form-label">Quote Date *</label>
              <input
                type="date"
                name="quoteDate"
                className="form-control"
                value={formData.quoteDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Expiry Date *</label>
              <input
                type="date"
                name="expiryDate"
                className="form-control"
                value={formData.expiryDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Quote Type</label>
              <select
                name="quoteType"
                className="form-control"
                value={formData.quoteType}
                onChange={handleChange}
              >
                <option value="quote">Quote</option>
                <option value="estimate">Estimate</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Salesperson</label>
              <input
                type="text"
                name="salesperson"
                className="form-control"
                value={formData.salesperson}
                onChange={handleChange}
                placeholder="Enter salesperson name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                name="status"
                className="form-control"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex-between">
            <h3 className="card-title">Line Items</h3>
            <button type="button" className="btn btn-sm btn-outline" onClick={addItem}>
              <Plus size={16} /> Add Item
            </button>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Discount %</th>
                  <th>Tax %</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {quoteItems.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        className="form-control"
                        value={item.itemId}
                        onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                        style={{ minWidth: '150px' }}
                      >
                        <option value="">Select Item</option>
                        {items.map(catalogItem => (
                          <option key={catalogItem.id} value={catalogItem.id}>
                            {catalogItem.item_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Description"
                        required
                        style={{ minWidth: '200px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        style={{ width: '100px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control"
                        value={item.discountPercent}
                        onChange={(e) => handleItemChange(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.01"
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control"
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.01"
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ${calculateLineTotal(item).toFixed(2)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => removeItem(index)}
                        disabled={quoteItems.length === 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '20px', borderTop: '2px solid var(--border-color)' }}>
            <div style={{ maxWidth: '400px', marginLeft: 'auto' }}>
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <span>Discount:</span>
                <span style={{ fontWeight: 600, color: 'var(--danger-color)' }}>
                  -${totals.totalDiscount.toFixed(2)}
                </span>
              </div>
              <div className="flex-between" style={{ marginBottom: '12px' }}>
                <span>Tax:</span>
                <span style={{ fontWeight: 600 }}>${totals.totalTax.toFixed(2)}</span>
              </div>
              <div className="flex-between" style={{ fontSize: '20px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: 700 }}>Total:</span>
                <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                  ${totals.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              name="notes"
              className="form-control"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Notes visible to customer"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Terms & Conditions</label>
            <textarea
              name="terms"
              className="form-control"
              value={formData.terms}
              onChange={handleChange}
              rows="3"
              placeholder="Quote terms and conditions"
            />
          </div>
        </div>

        <div className="flex gap-2" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/quotes')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            onClick={(e) => handleSubmit(e, 'save')}
            disabled={loading}
          >
            <Save size={18} />
            {loading ? 'Saving...' : id ? 'Update Quote' : 'Create Quote'}
          </button>
          {!id && (
            <>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={(e) => handleSubmit(e, 'email')}
                disabled={loading}
              >
                Create and Email
              </button>
              <button 
                type="button"
                className="btn btn-outline" 
                onClick={(e) => handleSubmit(e, 'print')}
                disabled={loading}
              >
                Create and Print
              </button>
              <button 
                type="button"
                className="btn btn-outline" 
                onClick={(e) => handleSubmit(e, 'preview')}
                disabled={loading}
              >
                Create and Preview
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default QuoteForm;



