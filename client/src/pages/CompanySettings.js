import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { Upload, X, Save, Globe } from 'lucide-react';
import './CompanySettings.css';

const CompanySettings = () => {
  const { company, setCompany } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    currency: '',
    postal_code: '',
    tax_number: '',
    logo_url: '',
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    routing_number: '',
    swift_bic: '',
    iban: '',
    bank_address: ''
  });
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    fetchCountries();
    fetchCompanySettings();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await axios.get('/api/countries');
      setCountries(response.data);
    } catch (error) {
      console.error('Failed to load countries:', error);
    }
  };

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        country: company.country || '',
        currency: company.currency || '',
        postal_code: company.postal_code || '',
        tax_number: company.tax_number || '',
        logo_url: company.logoUrl || company.logo_url || '',
        bank_name: company.bank_name || '',
        account_holder_name: company.account_holder_name || '',
        account_number: company.account_number || '',
        routing_number: company.routing_number || '',
        swift_bic: company.swift_bic || '',
        iban: company.iban || '',
        bank_address: company.bank_address || ''
      });
      setLogoPreview(company.logoUrl || company.logo_url || null);
    }
  }, [company]);

  const fetchCompanySettings = async () => {
    try {
      const response = await axios.get('/api/company');
      const companyData = response.data;
      
      setFormData({
        name: companyData.name || '',
        email: companyData.email || '',
        phone: companyData.phone || '',
        address: companyData.address || '',
        city: companyData.city || '',
        state: companyData.state || '',
        country: companyData.country || '',
        currency: companyData.currency || '',
        postal_code: companyData.postal_code || '',
        tax_number: companyData.tax_number || '',
        logo_url: companyData.logo_url || '',
        bank_name: companyData.bank_name || '',
        account_holder_name: companyData.account_holder_name || '',
        account_number: companyData.account_number || '',
        routing_number: companyData.routing_number || '',
        swift_bic: companyData.swift_bic || '',
        iban: companyData.iban || '',
        bank_address: companyData.bank_address || ''
      });
      setLogoPreview(companyData.logo_url || null);
    } catch (error) {
      console.error('Error fetching company settings:', error);
      toast.error('Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCountryChange = async (e) => {
    const countryCode = e.target.value;
    setFormData(prev => ({
      ...prev,
      country: countryCode
    }));

    if (countryCode) {
      try {
        const response = await axios.get(`/api/currency/${countryCode}`);
        setFormData(prev => ({
          ...prev,
          currency: response.data.currency
        }));
      } catch (error) {
        console.error('Failed to get currency:', error);
      }
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setFormData(prev => ({
        ...prev,
        logo_url: base64String
      }));
      setLogoPreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setFormData(prev => ({
      ...prev,
      logo_url: ''
    }));
    setLogoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await axios.put('/api/company', formData);
      
      // Update company in context
      if (setCompany) {
        setCompany(prev => ({
          ...prev,
          ...response.data.company,
          logoUrl: response.data.company.logo_url
        }));
      }
      
      // Update localStorage
      const storedCompany = localStorage.getItem('company');
      if (storedCompany) {
        const companyData = JSON.parse(storedCompany);
        companyData.logoUrl = response.data.company.logo_url;
        companyData.name = response.data.company.name;
        companyData.email = response.data.company.email;
        localStorage.setItem('company', JSON.stringify(companyData));
      }

      toast.success('Company settings updated successfully');
    } catch (error) {
      console.error('Error updating company settings:', error);
      toast.error(error.response?.data?.error || 'Failed to update company settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Company Settings</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2 style={{ marginBottom: '24px' }}>Company Logo</h2>
          
          <div className="logo-upload-section">
            <div className="logo-preview-container">
              {logoPreview ? (
                <>
                  <img 
                    src={logoPreview} 
                    alt="Company Logo" 
                    className="logo-preview"
                  />
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={removeLogo}
                    style={{ marginTop: '12px' }}
                  >
                    <X size={16} /> Remove Logo
                  </button>
                </>
              ) : (
                <div className="logo-placeholder">
                  <Upload size={48} style={{ color: 'var(--text-secondary)', marginBottom: '12px' }} />
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    No logo uploaded
                  </p>
                </div>
              )}
            </div>
            
            <div className="logo-upload-controls">
              <label htmlFor="logo-upload" className="btn btn-primary">
                <Upload size={18} /> {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
              <p className="help-text">
                Upload your company logo (max 5MB). Supported formats: JPG, PNG, GIF
              </p>
              <p className="help-text">
                Your logo will appear on invoices, quotes, and other documents.
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '24px' }}>Company Information</h2>
          
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Company Name *</label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-2">
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

            <div className="form-group">
              <label className="form-label">Tax Number</label>
              <input
                type="text"
                name="tax_number"
                className="form-control"
                value={formData.tax_number}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea
              name="address"
              className="form-control"
              rows="3"
              value={formData.address}
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
              <label className="form-label">State/Province</label>
              <input
                type="text"
                name="state"
                className="form-control"
                value={formData.state}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Postal Code</label>
              <input
                type="text"
                name="postal_code"
                className="form-control"
                value={formData.postal_code}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Globe size={16} style={{ marginRight: '5px' }} />
              Country
            </label>
            <select
              name="country"
              className="form-control"
              value={formData.country}
              onChange={handleCountryChange}
            >
              <option value="">Select Country</option>
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.currency} {country.currencySymbol})
                </option>
              ))}
            </select>
            {formData.country && (
              <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                Currency will be set to: {countries.find(c => c.code === formData.country)?.currency} ({countries.find(c => c.code === formData.country)?.currencySymbol})
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Currency</label>
            {formData.country ? (
              <>
                <input
                  type="text"
                  className="form-control"
                  value={`${formData.currency || countries.find(c => c.code === formData.country)?.currency || 'USD'} (${countries.find(c => c.code === formData.country)?.currencySymbol || '$'})`}
                  disabled
                  style={{ backgroundColor: '#f5f5f5' }}
                />
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  Currency is automatically set based on your country selection. Currency will be updated when you save.
                </small>
              </>
            ) : (
              <>
                <input
                  type="text"
                  className="form-control"
                  value={formData.currency || 'USD ($)'}
                  disabled
                  style={{ backgroundColor: '#f5f5f5' }}
                />
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  Select a country to automatically set the currency
                </small>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '24px' }}>Bank Account Details</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
            These details will appear on invoices and quotes for customer payments.
          </p>
          
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input
                type="text"
                name="bank_name"
                className="form-control"
                value={formData.bank_name}
                onChange={handleChange}
                placeholder="e.g., Bank of America"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Holder Name</label>
              <input
                type="text"
                name="account_holder_name"
                className="form-control"
                value={formData.account_holder_name}
                onChange={handleChange}
                placeholder="Business name on account"
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input
                type="text"
                name="account_number"
                className="form-control"
                value={formData.account_number}
                onChange={handleChange}
                placeholder="Bank account number"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Routing/Sort Code/BSB</label>
              <input
                type="text"
                name="routing_number"
                className="form-control"
                value={formData.routing_number}
                onChange={handleChange}
                placeholder="Routing number"
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">SWIFT/BIC Code</label>
              <input
                type="text"
                name="swift_bic"
                className="form-control"
                value={formData.swift_bic}
                onChange={handleChange}
                placeholder="For international transfers"
              />
            </div>

            <div className="form-group">
              <label className="form-label">IBAN</label>
              <input
                type="text"
                name="iban"
                className="form-control"
                value={formData.iban}
                onChange={handleChange}
                placeholder="International Bank Account Number"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Bank Branch Address</label>
            <textarea
              name="bank_address"
              className="form-control"
              rows="2"
              value={formData.bank_address}
              onChange={handleChange}
              placeholder="Bank branch address (optional)"
            />
          </div>
        </div>

        <div className="page-header">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={saving}
          >
            <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanySettings;



