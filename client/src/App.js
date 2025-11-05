import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import ChatBot from './components/ChatBot';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceView from './pages/InvoiceView';
import Quotes from './pages/Quotes';
import QuoteForm from './pages/QuoteForm';
import QuoteView from './pages/QuoteView';
import Payments from './pages/Payments';
import PaymentForm from './pages/PaymentForm';
import Items from './pages/Items';
import Reports from './pages/Reports';
import SystemAdminDashboard from './pages/SystemAdminDashboard';
import SystemMonitoring from './pages/SystemMonitoring';
import CompanySettings from './pages/CompanySettings';
import AccountSecurity from './pages/AccountSecurity';
import ChartOfAccounts from './pages/ChartOfAccounts';
import GeneralLedger from './pages/GeneralLedger';
import Expenses from './pages/Expenses';
import Vendors from './pages/Vendors';
import Projects from './pages/Projects';
import SubscriptionManagement from './pages/SubscriptionManagement';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <ToastContainer 
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
          
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="invoices/new" element={<InvoiceForm />} />
              <Route path="invoices/:id" element={<InvoiceView />} />
              <Route path="invoices/:id/edit" element={<InvoiceForm />} />
              <Route path="quotes" element={<Quotes />} />
              <Route path="quotes/new" element={<QuoteForm />} />
              <Route path="quotes/:id" element={<QuoteView />} />
              <Route path="quotes/:id/edit" element={<QuoteForm />} />
              <Route path="payments" element={<Payments />} />
              <Route path="payments/new" element={<PaymentForm />} />
              <Route path="items" element={<Items />} />
              <Route path="reports" element={<Reports />} />
              <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
              <Route path="general-ledger" element={<GeneralLedger />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="vendors" element={<Vendors />} />
              <Route path="projects" element={<Projects />} />
              <Route path="settings" element={<CompanySettings />} />
              <Route path="account-security" element={<AccountSecurity />} />
              <Route path="system-admin" element={<SystemAdminDashboard />} />
              <Route path="system-monitoring" element={<SystemMonitoring />} />
              <Route path="subscription-management" element={<SubscriptionManagement />} />
            </Route>
          </Routes>
          
          {/* AI Chatbot - Available on all pages */}
          <ChatBot />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

