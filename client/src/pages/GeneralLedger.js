import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Plus, Eye, FileText, Calendar, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const GeneralLedger = () => {
  const { token } = useAuth();
  const { formatCurrency } = useCurrency();
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [filterStartDate, setFilterStartDate] = useState(null);
  const [filterEndDate, setFilterEndDate] = useState(null);
  const [filterEntryType, setFilterEntryType] = useState('');
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: 'journal_entry',
    description: '',
    notes: '',
    lines: [{ account_id: '', debit_amount: 0, credit_amount: 0, description: '' }]
  });

  useEffect(() => {
    fetchEntries();
    fetchAccounts();
  }, [filterStartDate, filterEndDate, filterEntryType]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStartDate) params.startDate = filterStartDate.toISOString().split('T')[0];
      if (filterEndDate) params.endDate = filterEndDate.toISOString().split('T')[0];
      if (filterEntryType) params.entryType = filterEntryType;
      
      const response = await axios.get('/api/general-ledger', { params });
      setEntries(response.data);
    } catch (error) {
      toast.error('Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/chart-of-accounts');
      setAccounts(response.data);
    } catch (error) {
      toast.error('Failed to fetch accounts');
    }
  };

  const fetchEntryDetails = async (id) => {
    try {
      const response = await axios.get(`/api/general-ledger/${id}`);
      setSelectedEntry(response.data);
    } catch (error) {
      toast.error('Failed to fetch entry details');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLineChange = (index, e) => {
    const newLines = [...formData.lines];
    newLines[index] = {
      ...newLines[index],
      [e.target.name]: e.target.value
    };
    setFormData({ ...formData, lines: newLines });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { account_id: '', debit_amount: 0, credit_amount: 0, description: '' }]
    });
  };

  const removeLine = (index) => {
    const newLines = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: newLines });
  };

  const calculateTotals = () => {
    const totalDebits = formData.lines.reduce((sum, line) => sum + parseFloat(line.debit_amount || 0), 0);
    const totalCredits = formData.lines.reduce((sum, line) => sum + parseFloat(line.credit_amount || 0), 0);
    return { totalDebits, totalCredits };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { totalDebits, totalCredits } = calculateTotals();
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      toast.error(`Total debits (${totalDebits.toFixed(2)}) must equal total credits (${totalCredits.toFixed(2)})`);
      return;
    }

    if (formData.lines.some(line => !line.account_id)) {
      toast.error('All lines must have an account selected');
      return;
    }

    try {
      await axios.post('/api/general-ledger', formData);
      toast.success('Journal entry created successfully');
      fetchEntries();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create entry');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEntry(null);
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: 'journal_entry',
      description: '',
      notes: '',
      lines: [{ account_id: '', debit_amount: 0, credit_amount: 0, description: '' }]
    });
  };


  const getAccountName = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? `${account.account_code} - ${account.account_name}` : 'N/A';
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="card">
          <p>Loading entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>General Ledger</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> New Journal Entry
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header">
          <h3 className="card-title">
            <Filter size={20} style={{ marginRight: '8px' }} />
            Filters
          </h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} />
              <DatePicker
                selected={filterStartDate}
                onChange={(date) => setFilterStartDate(date)}
                selectsStart
                startDate={filterStartDate}
                endDate={filterEndDate}
                placeholderText="Start Date"
                className="form-control"
                style={{ width: '150px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DatePicker
                selected={filterEndDate}
                onChange={(date) => setFilterEndDate(date)}
                selectsEnd
                startDate={filterStartDate}
                endDate={filterEndDate}
                minDate={filterStartDate}
                placeholderText="End Date"
                className="form-control"
                style={{ width: '150px' }}
              />
            </div>
            <select
              value={filterEntryType}
              onChange={(e) => setFilterEntryType(e.target.value)}
              className="form-control"
              style={{ width: '200px' }}
            >
              <option value="">All Entry Types</option>
              <option value="journal_entry">Journal Entry</option>
              <option value="invoice">Invoice</option>
              <option value="payment">Payment</option>
              <option value="expense">Expense</option>
              <option value="adjustment">Adjustment</option>
            </select>
            <button className="btn btn-secondary" onClick={() => {
              setFilterStartDate(null);
              setFilterEndDate(null);
              setFilterEntryType('');
            }}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Entries Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Journal Entries</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Entry Number</th>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Lines</th>
                <th>Created By</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td><strong>{entry.entry_number}</strong></td>
                  <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
                  <td>
                    <span className="badge bg-info">{entry.entry_type}</span>
                  </td>
                  <td>{entry.description}</td>
                  <td>
                    {entry.reference_type && entry.reference_id ? (
                      <span>{entry.reference_type}: {entry.reference_id.substring(0, 8)}...</span>
                    ) : '-'}
                  </td>
                  <td>{entry.line_count || 0} lines</td>
                  <td>{entry.created_by_name || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        fetchEntryDetails(entry.id);
                      }}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entries.length === 0 && (
          <div className="empty-state" style={{ padding: '40px' }}>
            <FileText size={48} />
            <h3>No journal entries found</h3>
            <p>Create your first journal entry to get started</p>
          </div>
        )}
      </div>

      {/* Entry Details Modal */}
      {selectedEntry && (
        <div className="modal-overlay" onClick={() => setSelectedEntry(null)}>
          <div className="modal-content" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Journal Entry Details: {selectedEntry.entry_number}</h2>
              <button className="btn-close" onClick={() => setSelectedEntry(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="card mb-3">
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <strong>Date:</strong> {new Date(selectedEntry.entry_date).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Type:</strong> <span className="badge bg-info">{selectedEntry.entry_type}</span>
                    </div>
                    <div>
                      <strong>Description:</strong> {selectedEntry.description}
                    </div>
                    <div>
                      <strong>Created By:</strong> {selectedEntry.created_by_name || '-'}
                    </div>
                  </div>
                  {selectedEntry.notes && (
                    <div style={{ marginTop: '10px' }}>
                      <strong>Notes:</strong> {selectedEntry.notes}
                    </div>
                  )}
                </div>
              </div>

              <h4 style={{ marginBottom: '15px' }}>Transaction Lines</h4>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Debit</th>
                      <th style={{ textAlign: 'right' }}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEntry.lines?.map((line, index) => (
                      <tr key={index}>
                        <td>{getAccountName(line.account_id)}</td>
                        <td>{line.description || '-'}</td>
                        <td style={{ textAlign: 'right', color: line.debit_amount > 0 ? 'green' : '' }}>
                          {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                        </td>
                        <td style={{ textAlign: 'right', color: line.credit_amount > 0 ? 'red' : '' }}>
                          {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f8f9fa' }}>
                      <td colSpan="2" style={{ textAlign: 'right' }}>Totals:</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(selectedEntry.lines?.reduce((sum, line) => sum + parseFloat(line.debit_amount || 0), 0))}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(selectedEntry.lines?.reduce((sum, line) => sum + parseFloat(line.credit_amount || 0), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedEntry(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Entry Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Journal Entry</h2>
              <button className="btn-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label>Entry Date *</label>
                    <input
                      type="date"
                      name="entry_date"
                      value={formData.entry_date}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Entry Type *</label>
                    <select
                      name="entry_type"
                      value={formData.entry_type}
                      onChange={handleChange}
                      className="form-control"
                      required
                    >
                      <option value="journal_entry">Journal Entry</option>
                      <option value="invoice">Invoice</option>
                      <option value="payment">Payment</option>
                      <option value="expense">Expense</option>
                      <option value="adjustment">Adjustment</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="form-control"
                    required
                    placeholder="Brief description of this entry"
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="form-control"
                    rows="2"
                  />
                </div>

                <hr style={{ margin: '20px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4>Transaction Lines</h4>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={addLine}>
                    <Plus size={16} /> Add Line
                  </button>
                </div>

                {formData.lines.map((line, index) => (
                  <div key={index} className="card mb-3" style={{ padding: '15px', backgroundColor: '#f8f9fa' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', marginBottom: '10px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px' }}>Account *</label>
                        <select
                          name="account_id"
                          value={line.account_id}
                          onChange={(e) => handleLineChange(index, e)}
                          className="form-control"
                          required
                        >
                          <option value="">Select Account</option>
                          {accounts.map(account => (
                            <option key={account.id} value={account.id}>
                              {account.account_code} - {account.account_name} ({account.account_type})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px' }}>Debit</label>
                        <input
                          type="number"
                          step="0.01"
                          name="debit_amount"
                          value={line.debit_amount}
                          onChange={(e) => handleLineChange(index, e)}
                          className="form-control"
                          min="0"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px' }}>Credit</label>
                        <input
                          type="number"
                          step="0.01"
                          name="credit_amount"
                          value={line.credit_amount}
                          onChange={(e) => handleLineChange(index, e)}
                          className="form-control"
                          min="0"
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        {formData.lines.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeLine(index)}
                            title="Remove Line"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '12px' }}>Line Description (Optional)</label>
                      <input
                        type="text"
                        name="description"
                        value={line.description}
                        onChange={(e) => handleLineChange(index, e)}
                        className="form-control"
                      />
                    </div>
                  </div>
                ))}

                <div className="card" style={{ padding: '15px', backgroundColor: '#e3f2fd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Total Debits:</span>
                    <span style={{ color: calculateTotals().totalDebits === calculateTotals().totalCredits ? 'green' : 'red' }}>
                      {formatCurrency(calculateTotals().totalDebits)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '5px' }}>
                    <span>Total Credits:</span>
                    <span style={{ color: calculateTotals().totalDebits === calculateTotals().totalCredits ? 'green' : 'red' }}>
                      {formatCurrency(calculateTotals().totalCredits)}
                    </span>
                  </div>
                  {calculateTotals().totalDebits !== calculateTotals().totalCredits && (
                    <div style={{ marginTop: '10px', color: 'red', fontSize: '12px' }}>
                      ⚠️ Debits and Credits must be equal
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={calculateTotals().totalDebits !== calculateTotals().totalCredits}
                >
                  Create Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralLedger;

