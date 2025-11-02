import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    LogIn, AlertTriangle, Settings, Activity,
    CheckCircle, XCircle, Calendar, Search,
    Filter, RefreshCw, Eye, FileText, Server
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const SystemMonitoring = () => {
    const [activeTab, setActiveTab] = useState('login-history');
    const [loading, setLoading] = useState(false);
    const [loginHistory, setLoginHistory] = useState([]);
    const [errorLogs, setErrorLogs] = useState([]);
    const [systemConfig, setSystemConfig] = useState({});
    const [stats, setStats] = useState(null);
    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        email: '',
        companyId: '',
        successful: 'all',
        errorLevel: 'all',
        resolved: 'all'
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    });

    useEffect(() => {
        if (activeTab === 'login-history') {
            fetchLoginHistory();
        } else if (activeTab === 'error-logs') {
            fetchErrorLogs();
        } else if (activeTab === 'system-config') {
            fetchSystemConfig();
        } else if (activeTab === 'overview') {
            fetchStats();
        }
    }, [activeTab, filters, pagination.page]);

    const fetchLoginHistory = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...(filters.startDate && { startDate: filters.startDate.toISOString().split('T')[0] }),
                ...(filters.endDate && { endDate: filters.endDate.toISOString().split('T')[0] }),
                ...(filters.email && { email: filters.email }),
                ...(filters.companyId && { companyId: filters.companyId }),
                ...(filters.successful !== 'all' && { successful: filters.successful })
            };

            const response = await axios.get('/api/system-monitoring/login-history', { params });
            setLoginHistory(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            toast.error('Failed to fetch login history');
        } finally {
            setLoading(false);
        }
    };

    const fetchErrorLogs = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...(filters.startDate && { startDate: filters.startDate.toISOString().split('T')[0] }),
                ...(filters.endDate && { endDate: filters.endDate.toISOString().split('T')[0] }),
                ...(filters.errorLevel !== 'all' && { errorLevel: filters.errorLevel }),
                ...(filters.resolved !== 'all' && { resolved: filters.resolved }),
                ...(filters.companyId && { companyId: filters.companyId })
            };

            const response = await axios.get('/api/system-monitoring/error-logs', { params });
            setErrorLogs(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            toast.error('Failed to fetch error logs');
        } finally {
            setLoading(false);
        }
    };

    const fetchSystemConfig = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/system-monitoring/system-config');
            setSystemConfig(response.data);
        } catch (error) {
            toast.error('Failed to fetch system configuration');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const params = {
                ...(filters.startDate && { startDate: filters.startDate.toISOString().split('T')[0] }),
                ...(filters.endDate && { endDate: filters.endDate.toISOString().split('T')[0] })
            };

            const response = await axios.get('/api/system-monitoring/monitoring-stats', { params });
            setStats(response.data);
        } catch (error) {
            toast.error('Failed to fetch monitoring statistics');
        } finally {
            setLoading(false);
        }
    };

    const handleResolveError = async (errorId, notes) => {
        try {
            await axios.patch(`/api/system-monitoring/error-logs/${errorId}/resolve`, { notes });
            toast.success('Error marked as resolved');
            fetchErrorLogs();
        } catch (error) {
            toast.error('Failed to resolve error');
        }
    };

    const handleUpdateConfig = async (key, value, category) => {
        try {
            await axios.put(`/api/system-monitoring/system-config/${key}`, { value });
            toast.success('Configuration updated successfully');
            // Update local state immediately for better UX
            setSystemConfig(prev => {
                const updated = { ...prev };
                if (updated[category] && updated[category][key]) {
                    updated[category] = {
                        ...updated[category],
                        [key]: {
                            ...updated[category][key],
                            value: value
                        }
                    };
                }
                return updated;
            });
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message || 'Failed to update configuration';
            toast.error(errorMessage);
            // Refresh to get the correct value back
            fetchSystemConfig();
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'login-history', label: 'Login History', icon: LogIn },
        { id: 'error-logs', label: 'Error Logs', icon: AlertTriangle },
        { id: 'system-config', label: 'System Config', icon: Settings }
    ];

    return (
        <div className="page-content">
            <div className="page-header">
                <h1 className="page-title">System Monitoring</h1>
                <button 
                    className="btn btn-outline" 
                    onClick={() => {
                        if (activeTab === 'login-history') fetchLoginHistory();
                        else if (activeTab === 'error-logs') fetchErrorLogs();
                        else if (activeTab === 'system-config') fetchSystemConfig();
                        else if (activeTab === 'overview') fetchStats();
                    }}
                >
                    <RefreshCw size={18} /> Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color)' }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
                                style={{ 
                                    borderRadius: 0,
                                    borderBottom: activeTab === tab.id ? '2px solid var(--primary-color)' : 'none',
                                    marginBottom: '-2px'
                                }}
                            >
                                <Icon size={18} style={{ marginRight: '8px' }} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} />
                        <label>Start Date:</label>
                        <DatePicker
                            selected={filters.startDate}
                            onChange={(date) => setFilters({ ...filters, startDate: date })}
                            dateFormat="yyyy-MM-dd"
                            className="form-control"
                            style={{ width: '150px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} />
                        <label>End Date:</label>
                        <DatePicker
                            selected={filters.endDate}
                            onChange={(date) => setFilters({ ...filters, endDate: date })}
                            dateFormat="yyyy-MM-dd"
                            className="form-control"
                            style={{ width: '150px' }}
                        />
                    </div>
                    {activeTab === 'login-history' && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Email"
                                    value={filters.email}
                                    onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                                    className="form-control"
                                    style={{ width: '200px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Filter size={16} />
                                <select
                                    value={filters.successful}
                                    onChange={(e) => setFilters({ ...filters, successful: e.target.value })}
                                    className="form-control"
                                >
                                    <option value="all">All Logins</option>
                                    <option value="true">Successful</option>
                                    <option value="false">Failed</option>
                                </select>
                            </div>
                        </>
                    )}
                    {activeTab === 'error-logs' && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Filter size={16} />
                                <select
                                    value={filters.errorLevel}
                                    onChange={(e) => setFilters({ ...filters, errorLevel: e.target.value })}
                                    className="form-control"
                                >
                                    <option value="all">All Levels</option>
                                    <option value="critical">Critical</option>
                                    <option value="error">Error</option>
                                    <option value="warning">Warning</option>
                                    <option value="info">Info</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Filter size={16} />
                                <select
                                    value={filters.resolved}
                                    onChange={(e) => setFilters({ ...filters, resolved: e.target.value })}
                                    className="form-control"
                                >
                                    <option value="all">All</option>
                                    <option value="true">Resolved</option>
                                    <option value="false">Unresolved</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading && (
                <div className="card">
                    <div className="spinner"></div>
                </div>
            )}

            {!loading && activeTab === 'overview' && stats && (
                <div>
                    <div className="grid grid-3" style={{ marginBottom: '24px' }}>
                        <div className="card">
                            <h3 style={{ marginBottom: '16px' }}>Login Statistics</h3>
                            <div style={{ marginBottom: '8px' }}>
                                <strong>Total Logins:</strong> {stats.loginStats?.total_logins || 0}
                            </div>
                            <div style={{ marginBottom: '8px', color: 'var(--success-color)' }}>
                                <strong>Successful:</strong> {stats.loginStats?.successful_logins || 0}
                            </div>
                            <div style={{ marginBottom: '8px', color: 'var(--danger-color)' }}>
                                <strong>Failed:</strong> {stats.loginStats?.failed_logins || 0}
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                <strong>Unique Users:</strong> {stats.loginStats?.unique_users || 0}
                            </div>
                            <div>
                                <strong>Unique Companies:</strong> {stats.loginStats?.unique_companies || 0}
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ marginBottom: '16px' }}>Error Statistics</h3>
                            <div style={{ marginBottom: '8px' }}>
                                <strong>Total Errors:</strong> {stats.errorStats?.total_errors || 0}
                            </div>
                            <div style={{ marginBottom: '8px', color: '#dc2626' }}>
                                <strong>Critical:</strong> {stats.errorStats?.critical_errors || 0}
                            </div>
                            <div style={{ marginBottom: '8px', color: 'var(--danger-color)' }}>
                                <strong>Errors:</strong> {stats.errorStats?.errors || 0}
                            </div>
                            <div style={{ marginBottom: '8px', color: 'var(--warning-color)' }}>
                                <strong>Warnings:</strong> {stats.errorStats?.warnings || 0}
                            </div>
                            <div style={{ marginBottom: '8px', color: 'var(--success-color)' }}>
                                <strong>Resolved:</strong> {stats.errorStats?.resolved_errors || 0}
                            </div>
                            <div style={{ color: 'var(--danger-color)' }}>
                                <strong>Unresolved:</strong> {stats.errorStats?.unresolved_errors || 0}
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ marginBottom: '16px' }}>Recent Activity</h3>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                Check Login History and Error Logs tabs for detailed information
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!loading && activeTab === 'login-history' && (
                <div className="card">
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Email</th>
                                    <th>User</th>
                                    <th>Company</th>
                                    <th>Status</th>
                                    <th>IP Address</th>
                                    <th>User Agent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loginHistory.map(login => (
                                    <tr key={login.id}>
                                        <td>{new Date(login.login_timestamp).toLocaleString()}</td>
                                        <td>{login.email}</td>
                                        <td>{login.user_name || '-'}</td>
                                        <td>{login.company_name || '-'}</td>
                                        <td>
                                            {login.login_successful ? (
                                                <span className="badge badge-success">
                                                    <CheckCircle size={14} style={{ marginRight: '4px' }} />
                                                    Success
                                                </span>
                                            ) : (
                                                <span className="badge badge-danger">
                                                    <XCircle size={14} style={{ marginRight: '4px' }} />
                                                    Failed
                                                </span>
                                            )}
                                        </td>
                                        <td>{login.ip_address || '-'}</td>
                                        <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {login.user_agent || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {pagination.totalPages > 1 && (
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button
                                className="btn btn-outline"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                            >
                                Previous
                            </button>
                            <span style={{ alignSelf: 'center', padding: '0 16px' }}>
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                                className="btn btn-outline"
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}

            {!loading && activeTab === 'error-logs' && (
                <div className="card">
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Level</th>
                                    <th>Message</th>
                                    <th>User</th>
                                    <th>Company</th>
                                    <th>URL</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {errorLogs.map(error => (
                                    <tr key={error.id}>
                                        <td>{new Date(error.occurred_at).toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${
                                                error.error_level === 'critical' ? 'badge-danger' :
                                                error.error_level === 'error' ? 'badge-danger' :
                                                error.error_level === 'warning' ? 'badge-warning' :
                                                'badge-info'
                                            }`}>
                                                {error.error_level}
                                            </span>
                                        </td>
                                        <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {error.error_message}
                                        </td>
                                        <td>{error.user_name || error.user_email || '-'}</td>
                                        <td>{error.company_name || '-'}</td>
                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {error.request_url || '-'}
                                        </td>
                                        <td>
                                            {error.resolved ? (
                                                <span className="badge badge-success">Resolved</span>
                                            ) : (
                                                <span className="badge badge-danger">Unresolved</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => {
                                                    const notes = prompt('Enter resolution notes (optional):');
                                                    if (notes !== null) {
                                                        handleResolveError(error.id, notes);
                                                    }
                                                }}
                                                disabled={error.resolved}
                                            >
                                                <CheckCircle size={14} /> Resolve
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline"
                                                style={{ marginLeft: '8px' }}
                                                onClick={() => {
                                                    alert(`Stack Trace:\n\n${error.error_stack || 'No stack trace available'}`);
                                                }}
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {pagination.totalPages > 1 && (
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button
                                className="btn btn-outline"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                            >
                                Previous
                            </button>
                            <span style={{ alignSelf: 'center', padding: '0 16px' }}>
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                                className="btn btn-outline"
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}

            {!loading && activeTab === 'system-config' && (
                <div>
                    {Object.entries(systemConfig).map(([category, configs]) => (
                        <div key={category} className="card" style={{ marginBottom: '24px' }}>
                            <h3 style={{ marginBottom: '16px', textTransform: 'capitalize' }}>{category}</h3>
                            <div className="table-responsive">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Key</th>
                                            <th>Value</th>
                                            <th>Type</th>
                                            <th>Description</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(configs).map(([key, config]) => (
                                            <tr key={key}>
                                                <td><strong>{key}</strong></td>
                                                <td>
                                                    {config.isEditable ? (
                                                        config.type === 'boolean' ? (
                                                            <select
                                                                value={String(config.value)}
                                                                onChange={(e) => {
                                                                    const boolValue = e.target.value === 'true';
                                                                    handleUpdateConfig(key, boolValue, category);
                                                                }}
                                                                className="form-control"
                                                                style={{ width: '150px' }}
                                                            >
                                                                <option value="true">True</option>
                                                                <option value="false">False</option>
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type={config.type === 'number' ? 'number' : 'text'}
                                                                defaultValue={config.value}
                                                                onBlur={(e) => {
                                                                    const value = config.type === 'number' 
                                                                        ? parseFloat(e.target.value) || 0 
                                                                        : e.target.value;
                                                                    // Only update if value actually changed
                                                                    if (value !== config.value) {
                                                                        handleUpdateConfig(key, value, category);
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    // Update on Enter key
                                                                    if (e.key === 'Enter') {
                                                                        e.target.blur();
                                                                    }
                                                                }}
                                                                className="form-control"
                                                                style={{ width: '200px' }}
                                                            />
                                                        )
                                                    ) : (
                                                        <span>{String(config.value)}</span>
                                                    )}
                                                </td>
                                                <td>{config.type}</td>
                                                <td>{config.description || '-'}</td>
                                                <td>
                                                    {config.isEditable && (
                                                        <span className="badge badge-info">Editable</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SystemMonitoring;

