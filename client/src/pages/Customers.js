import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2, Mail, Phone, MapPin } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    customerName: '',
    email: '',
    phone: '',
    contactPerson: '',
    billingAddress: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    paymentTerms: 'Net 30',
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data);
    } catch (error) {
      toast.error('Failed to fetch customers');
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
      if (editingCustomer) {
        await axios.put(`/api/customers/${editingCustomer.id}`, formData);
        toast.success('Customer updated successfully');
      } else {
        await axios.post('/api/customers', formData);
        toast.success('Customer created successfully');
      }
      fetchCustomers();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      customerName: customer.customer_name,
      email: customer.email || '',
      phone: customer.phone || '',
      contactPerson: customer.contact_person || '',
      billingAddress: customer.billing_address || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || '',
      postalCode: customer.postal_code || '',
      paymentTerms: customer.payment_terms || 'Net 30',
      notes: customer.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await axios.delete(`/api/customers/${id}`);
        toast.success('Customer deleted successfully');
        fetchCustomers();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete customer');
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({
      customerName: '',
      email: '',
      phone: '',
      contactPerson: '',
      billingAddress: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      paymentTerms: 'Net 30',
      notes: ''
    });
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Customer
        </button>
      </div>

      <div className="card">
        {customers.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Payment Terms</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{customer.customer_name}</div>
                      {customer.contact_person && (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {customer.contact_person}
                        </div>
                      )}
                    </td>
                    <td>
                      {customer.email && (
                        <div className="flex gap-1" style={{ fontSize: '13px', marginBottom: '4px' }}>
                          <Mail size={14} /> {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex gap-1" style={{ fontSize: '13px' }}>
                          <Phone size={14} /> {customer.phone}
                        </div>
                      )}
                    </td>
                    <td>
                      {(customer.city || customer.state || customer.country) && (
                        <div className="flex gap-1" style={{ fontSize: '13px' }}>
                          <MapPin size={14} />
                          {[customer.city, customer.state, customer.country]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                    </td>
                    <td>{customer.payment_terms}</td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleEdit(customer)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(customer.id)}
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
            <div className="empty-state-title">No customers yet</div>
            <div className="empty-state-text">
              Get started by adding your first customer
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} /> Add Customer
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button onClick={closeModal} className="btn btn-sm">×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Customer Name *</label>
                    <input
                      type="text"
                      name="customerName"
                      className="form-control"
                      value={formData.customerName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      name="contactPerson"
                      className="form-control"
                      value={formData.contactPerson}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      className="form-control"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Billing Address</label>
                  <input
                    type="text"
                    name="billingAddress"
                    className="form-control"
                    value={formData.billingAddress}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-3">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      name="city"
                      className="form-control"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      name="state"
                      className="form-control"
                      value={formData.state}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      name="country"
                      className="form-control"
                      value={formData.country}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Postal Code</label>
                    <input
                      type="text"
                      name="postalCode"
                      className="form-control"
                      value={formData.postalCode}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Terms</label>
                    <select
                      name="paymentTerms"
                      className="form-control"
                      value={formData.paymentTerms}
                      onChange={handleChange}
                    >
                      <option value="COD">Cash on Delivery</option>
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 60">Net 60 Days</option>
                      <option value="Net 90">Net 90 Days</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    name="notes"
                    className="form-control"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCustomer ? 'Update' : 'Create'} Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;



