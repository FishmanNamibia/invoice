import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Plus, Clock, DollarSign, Users, Calendar, Edit2, Trash2, Play, Square } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';

const Projects = () => {
  const { formatCurrency } = useCurrency();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTimer, setActiveTimer] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data.projects || response.data);
    } catch (error) {
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await axios.delete(`/api/projects/${id}`);
        toast.success('Project deleted successfully');
        fetchProjects();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete project');
      }
    }
  };

  const startTimer = (projectId) => {
    setActiveTimer({
      projectId,
      startTime: new Date(),
      interval: setInterval(() => {
        // Timer UI updates handled by TimeEntryModal
      }, 1000)
    });
    setSelectedProject(projects.find(p => p.id === projectId));
    setShowTimeModal(true);
  };

  const stopTimer = () => {
    if (activeTimer?.interval) {
      clearInterval(activeTimer.interval);
    }
    setActiveTimer(null);
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projects & Time Tracking</h1>
        <button
          onClick={() => {
            setEditingProject(null);
            setShowProjectModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={18} /> New Project
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No projects found
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {projects.map((project) => {
            const totalHours = project.total_minutes ? (project.total_minutes / 60).toFixed(1) : 0;
            const billableAmount = project.billable_amount || 0;

            return (
              <div key={project.id} className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, marginBottom: '4px' }}>{project.name}</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{project.project_number}</p>
                    </div>
                    <span className={
                      project.status === 'active' ? 'badge badge-success' :
                      project.status === 'completed' ? 'badge badge-info' :
                      'badge badge-secondary'
                    }>
                      {project.status}
                    </span>
                  </div>

                  {project.description && (
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{project.description}</p>
                  )}

                  {project.customer_name && (
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      <span style={{ fontWeight: 600 }}>Customer:</span> {project.customer_name}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={16} />
                        Time Logged
                      </span>
                      <span style={{ fontWeight: 600 }}>{totalHours} hrs</span>
                    </div>
                    {project.billing_type === 'hourly' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <DollarSign size={16} />
                          Billable Amount
                        </span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(billableAmount)}</span>
                      </div>
                    )}
                    {project.budget && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Budget</span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(project.budget)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={16} />
                        Entries
                      </span>
                      <span style={{ fontWeight: 600 }}>{project.time_entries_count || 0}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setShowTimeModal(true);
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      <Clock size={16} /> Log Time
                    </button>
                    <button
                      onClick={() => startTimer(project.id)}
                      className="btn btn-success btn-sm"
                      title="Start Timer"
                    >
                      <Play size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingProject(project);
                        setShowProjectModal(true);
                      }}
                      className="btn btn-sm btn-outline"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="btn btn-sm btn-danger"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => {
            setShowProjectModal(false);
            setEditingProject(null);
          }}
          onSave={() => {
            fetchProjects();
            setShowProjectModal(false);
            setEditingProject(null);
          }}
        />
      )}

      {/* Time Entry Modal */}
      {showTimeModal && (
        <TimeEntryModal
          project={selectedProject}
          activeTimer={activeTimer}
          onClose={() => {
            setShowTimeModal(false);
            setSelectedProject(null);
            stopTimer();
          }}
          onSave={() => {
            fetchProjects();
            setShowTimeModal(false);
            setSelectedProject(null);
            stopTimer();
          }}
        />
      )}
    </div>
  );
};

// Project Modal Component
const ProjectModal = ({ project, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    customer_id: project?.customer_id || '',
    billing_type: project?.billing_type || 'hourly',
    hourly_rate: project?.hourly_rate || '',
    budget: project?.budget || '',
    status: project?.status || 'active',
    start_date: project?.start_date || '',
    end_date: project?.end_date || '',
    color: project?.color || '#6366f1'
  });

  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data.customers || response.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (project) {
        await axios.put(`/api/projects/${project.id}`, formData);
        toast.success('Project updated successfully');
      } else {
        await axios.post('/api/projects', formData);
        toast.success('Project created successfully');
      }
      onSave();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save project');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {project ? 'Edit Project' : 'New Project'}
          </h2>
          <button onClick={onClose} className="btn btn-sm">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-control"
                rows="3"
              />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Customer</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="form-control"
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name || customer.customer_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Billing Type</label>
                <select
                  value={formData.billing_type}
                  onChange={(e) => setFormData({ ...formData, billing_type: e.target.value })}
                  className="form-control"
                >
                  <option value="hourly">Hourly</option>
                  <option value="fixed">Fixed</option>
                  <option value="non_billable">Non-Billable</option>
                </select>
              </div>
            </div>

            {formData.billing_type === 'hourly' && (
              <div className="form-group">
                <label className="form-label">Hourly Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  className="form-control"
                />
              </div>
            )}

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Budget</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="form-control"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {project ? 'Update' : 'Create'} Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Time Entry Modal Component
const TimeEntryModal = ({ project, activeTimer, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    start_time: activeTimer?.startTime ? new Date(activeTimer.startTime).toISOString() : '',
    end_time: '',
    duration: '',
    is_billable: true,
    hourly_rate: project?.hourly_rate || ''
  });

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (activeTimer) {
      const interval = setInterval(() => {
        const elapsedSeconds = Math.floor((new Date() - activeTimer.startTime) / 1000);
        setElapsed(elapsedSeconds);
        const minutes = Math.floor(elapsedSeconds / 60);
        setFormData(prev => ({ ...prev, duration: minutes }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeTimer) {
        // Stop timer and save
        const endTime = new Date();
        formData.end_time = endTime.toISOString();
        formData.duration = Math.floor((endTime - activeTimer.startTime) / 60);
      }

      await axios.post(`/api/projects/${project.id}/time-entries`, formData);
      toast.success('Time entry logged successfully');
      onSave();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save time entry');
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {activeTimer ? 'Timer Running' : 'Log Time Entry'}
          </h2>
          <button onClick={onClose} className="btn btn-sm">×</button>
        </div>

        {activeTimer && (
          <div style={{ padding: '20px', backgroundColor: 'var(--info-color)', color: 'white', textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
              {formatTime(elapsed)}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Time Elapsed</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Task Name</label>
              <input
                type="text"
                value={formData.task_name}
                onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                className="form-control"
                placeholder="e.g., Development, Design, Testing"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-control"
                rows="3"
              />
            </div>

            {!activeTimer && (
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={formData.is_billable}
                onChange={(e) => setFormData({ ...formData, is_billable: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Billable</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline">
              {activeTimer ? 'Cancel' : 'Close'}
            </button>
            <button type="submit" className="btn btn-primary">
              {activeTimer ? 'Stop & Save' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Projects;
