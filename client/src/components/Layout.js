import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, Users, FileText, FileCheck, CreditCard, 
  Package, BarChart3, LogOut, Menu, X, Settings, Building2,
  BookOpen, FileSpreadsheet, Activity, Shield, DollarSign,
  Clock, Mail, TrendingUp
} from 'lucide-react';
import './Layout.css';

const Layout = () => {
  const { user, company, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isSuperAdmin = user?.role === 'superadmin';

  const regularMenuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/customers', icon: Users, label: 'Customers' },
    { path: '/invoices', icon: FileText, label: 'Invoices' },
    { path: '/quotes', icon: FileCheck, label: 'Quotes' },
    { path: '/payments', icon: CreditCard, label: 'Payments' },
    { path: '/items', icon: Package, label: 'Items' },
    { path: '/expenses', icon: DollarSign, label: 'Expenses' },
    { path: '/vendors', icon: Building2, label: 'Vendors' },
    { path: '/projects', icon: Clock, label: 'Projects & Time' },
    { path: '/chart-of-accounts', icon: BookOpen, label: 'Chart of Accounts' },
    { path: '/general-ledger', icon: FileSpreadsheet, label: 'General Ledger' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/account-security', icon: Shield, label: 'Account Security' },
  ];

  const adminMenuItems = [
    { path: '/system-admin', icon: Settings, label: 'System Admin' },
    { path: '/system-monitoring', icon: Activity, label: 'System Monitoring' },
    { path: '/subscription-management', icon: Mail, label: 'Subscriptions & Reminders' },
  ];

  const menuItems = isSuperAdmin ? adminMenuItems : regularMenuItems;

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          {sidebarOpen ? (
            <img 
              src="/system-logo.png" 
              alt="DynaFinances Logo" 
              style={{ 
                maxWidth: '180px', 
                maxHeight: '60px', 
                marginBottom: '8px',
                objectFit: 'contain'
              }} 
            />
          ) : (
            <h2 className="sidebar-title">DF</h2>
          )}
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="sidebar-company">
          {sidebarOpen && (
            <>
              <div className="company-name">
                {isSuperAdmin ? 'System Administrator' : (company?.name || 'No Company')}
              </div>
              <div className="company-user">{user?.email}</div>
              {isSuperAdmin && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                  Super Admin
                </div>
              )}
            </>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={!sidebarOpen ? item.label : ''}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button 
            className="logout-btn"
            onClick={handleLogout}
            title={!sidebarOpen ? 'Logout' : ''}
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

