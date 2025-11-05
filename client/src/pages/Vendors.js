import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2, Search, Building2, Mail, Phone, Star } from 'lucide-react';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  useEffect(() => {
    fetchVendors();
  }, [searchTerm]);

  const fetchVendors = async () => {
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const response = await axios.get('/api/vendors', { params });
      setVendors(response.data.vendors || response.data);
    } catch (error) {
      toast.error('Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        await axios.delete(`/api/vendors/${id}`);
        toast.success('Vendor deleted successfully');
        fetchVendors();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete vendor');
      }
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Vendors</h1>
        <button
          onClick={() => {
            setEditingVendor(null);
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={18} /> Add Vendor
        </button>
      </div>

      {/* Search */}
      <div className="card mb-4">
        <div className="card-body">
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>
      </div>

      {/* Vendors Grid */}
      {vendors.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No vendors found
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {vendors.map((vendor) => (
            <div key={vendor.id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 className="text-primary" size={24} />
                    <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{vendor.name}</h3>
                  </div>
                  {vendor.rating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Star className="text-warning" style={{ fill: 'currentColor' }} size={16} />
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{vendor.rating}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {vendor.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <Mail size={16} />
                      <span>{vendor.email}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <Phone size={16} />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.contact_person && (
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600 }}>Contact:</span> {vendor.contact_person}
                    </div>
                  )}
                  {vendor.payment_terms && (
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600 }}>Payment Terms:</span> {vendor.payment_terms} days
                    </div>
                  )}
                  {vendor.credit_limit && (
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600 }}>Credit Limit:</span> ${vendor.credit_limit.toLocaleString()}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                  <span className={vendor.is_active ? 'badge badge-success' : 'badge badge-secondary'}>
                    {vendor.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setEditingVendor(vendor);
                        setShowModal(true);
                      }}
                      className="btn btn-sm btn-outline"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(vendor.id)}
                      className="btn btn-sm btn-danger"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vendor Modal */}
      {showModal && (
        <VendorModal
          vendor={editingVendor}
          onClose={() => {
            setShowModal(false);
            setEditingVendor(null);
          }}
          onSave={() => {
            fetchVendors();
            setShowModal(false);
            setEditingVendor(null);
          }}
        />
      )}
    </div>
  );
};

// Vendor Modal Component
const VendorModal = ({ vendor, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: vendor?.name || '',
    contact_person: vendor?.contact_person || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    website: vendor?.website || '',
    address_line1: vendor?.address_line1 || '',
    city: vendor?.city || '',
    state: vendor?.state || '',
    postal_code: vendor?.postal_code || '',
    country: vendor?.country || '',
    payment_terms: vendor?.payment_terms || 30,
    payment_method: vendor?.payment_method || 'bank_transfer',
    credit_limit: vendor?.credit_limit || '',
    rating: vendor?.rating || '',
    notes: vendor?.notes || '',
    is_active: vendor?.is_active !== undefined ? vendor.is_active : true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (vendor) {
        await axios.put(`/api/vendors/${vendor.id}`, formData);
        toast.success('Vendor updated successfully');
      } else {
        await axios.post('/api/vendors', formData);
        toast.success('Vendor created successfully');
      }
      onSave();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save vendor');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {vendor ? 'Edit Vendor' : 'Add Vendor'}
          </h2>
          <button onClick={onClose} className="btn btn-sm">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Vendor Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Contact Person</label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-control"
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Terms (days)</label>
                <input
                  type="number"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) })}
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <input
                type="text"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                className="form-control"
                placeholder="Street Address"
              />
            </div>

            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Postal Code</label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className="form-control"
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Credit Limit</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Rating (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-control"
                rows="3"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Active</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {vendor ? 'Update' : 'Create'} Vendor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Vendors;
