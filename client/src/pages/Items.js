import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';

const Items = () => {
  const { formatCurrency } = useCurrency();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    itemCode: '',
    itemName: '',
    description: '',
    unitPrice: '',
    costPrice: '',
    itemType: 'product',
    unit: 'unit'
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get('/api/items');
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to fetch items');
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
      if (editingItem) {
        await axios.put(`/api/items/${editingItem.id}`, formData);
        toast.success('Item updated successfully');
      } else {
        await axios.post('/api/items', formData);
        toast.success('Item created successfully');
      }
      fetchItems();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      itemCode: item.item_code || '',
      itemName: item.item_name,
      description: item.description || '',
      unitPrice: item.unit_price,
      costPrice: item.cost_price || '',
      itemType: item.item_type || 'product',
      unit: item.unit || 'unit'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`/api/items/${id}`);
        toast.success('Item deleted successfully');
        fetchItems();
      } catch (error) {
        toast.error('Failed to delete item');
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      itemCode: '',
      itemName: '',
      description: '',
      unitPrice: '',
      costPrice: '',
      itemType: 'product',
      unit: 'unit'
    });
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Items & Services</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Item
        </button>
      </div>

      <div className="card">
        {items.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Unit Price</th>
                  <th>Cost Price</th>
                  <th>Unit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.item_code || '-'}</td>
                    <td>
                      <div className="flex gap-1">
                        <Package size={16} style={{ color: 'var(--primary-color)' }} />
                        {item.item_name}
                      </div>
                    </td>
                    <td>{item.description || '-'}</td>
                    <td>
                      <span className={`badge badge-${item.item_type === 'product' ? 'info' : 'secondary'}`}>
                        {item.item_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td>
                      {item.cost_price ? formatCurrency(item.cost_price) : '-'}
                    </td>
                    <td>{item.unit}</td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(item.id)}
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
            <div className="empty-state-title">No items yet</div>
            <div className="empty-state-text">
              Create your item catalog for faster invoicing
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} /> Add Item
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button onClick={closeModal} className="btn btn-sm">×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Item Code</label>
                    <input
                      type="text"
                      name="itemCode"
                      className="form-control"
                      value={formData.itemCode}
                      onChange={handleChange}
                      placeholder="SKU or code"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Item Type</label>
                    <select
                      name="itemType"
                      className="form-control"
                      value={formData.itemType}
                      onChange={handleChange}
                    >
                      <option value="product">Product</option>
                      <option value="service">Service</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Item Name *</label>
                  <input
                    type="text"
                    name="itemName"
                    className="form-control"
                    value={formData.itemName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-control"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>

                <div className="grid grid-3">
                  <div className="form-group">
                    <label className="form-label">Unit Price *</label>
                    <input
                      type="number"
                      name="unitPrice"
                      className="form-control"
                      value={formData.unitPrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cost Price</label>
                    <input
                      type="number"
                      name="costPrice"
                      className="form-control"
                      value={formData.costPrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select
                      name="unit"
                      className="form-control"
                      value={formData.unit}
                      onChange={handleChange}
                    >
                      <option value="unit">Unit</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="kg">Kg</option>
                      <option value="lbs">Lbs</option>
                      <option value="pieces">Pieces</option>
                      <option value="box">Box</option>
                      <option value="dozen">Dozen</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Update' : 'Create'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Items;



