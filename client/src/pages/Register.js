import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Mail, Lock, User, Phone, MapPin, Globe } from 'lucide-react';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    currency: 'USD'
  });
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await axios.get('/api/countries');
      setCountries(response.data);
    } catch (error) {
      console.error('Failed to load countries:', error);
      toast.error('Failed to load countries list');
    } finally {
      setLoadingCountries(false);
    }
  };

  const handleCountryChange = async (e) => {
    const countryCode = e.target.value;
    setFormData({
      ...formData,
      country: countryCode
    });

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <div className="auth-header">
          <Building2 size={48} className="auth-icon" />
          <h1 className="auth-title">Create Your Account</h1>
          <p className="auth-subtitle">Start managing your finances today</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">
                <Building2 size={16} /> Company Name *
              </label>
              <input
                type="text"
                name="companyName"
                className="form-control"
                value={formData.companyName}
                onChange={handleChange}
                required
                placeholder="Your company name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Mail size={16} /> Company Email *
              </label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="company@example.com"
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">
                <User size={16} /> First Name *
              </label>
              <input
                type="text"
                name="firstName"
                className="form-control"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="John"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <User size={16} /> Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                className="form-control"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">
                <Lock size={16} /> Password *
              </label>
              <input
                type="password"
                name="password"
                className="form-control"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Min. 6 characters"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={16} /> Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                className="form-control"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm password"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Phone size={16} /> Phone
            </label>
            <input
              type="tel"
              name="phone"
              className="form-control"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 234 567 8900"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <MapPin size={16} /> Address
            </label>
            <input
              type="text"
              name="address"
              className="form-control"
              value={formData.address}
              onChange={handleChange}
              placeholder="Street address"
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
                placeholder="City"
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
                placeholder="State"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Globe size={16} /> Country *
              </label>
              <select
                name="country"
                className="form-control"
                value={formData.country}
                onChange={handleCountryChange}
                required
                disabled={loadingCountries}
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
          </div>

          {formData.currency && (
            <div className="form-group">
              <label className="form-label">Currency</label>
              <input
                type="text"
                className="form-control"
                value={`${formData.currency} (${countries.find(c => c.code === formData.country)?.currencySymbol || ''})`}
                disabled
                style={{ backgroundColor: '#f5f5f5' }}
              />
              <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                Currency is automatically set based on your country selection
              </small>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;



