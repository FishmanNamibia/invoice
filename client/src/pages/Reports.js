import React, { useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Download, FileText, DollarSign, TrendingUp, BarChart3, Mail } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import html2pdf from 'html2pdf.js';

const REPORT_TYPES = {
  // Core Financial Statements
  balanceSheet: {
    id: 'balance-sheet',
    name: 'Balance Sheet (Statement of Financial Position)',
    description: 'Shows assets, liabilities, and equity at a specific date',
    category: 'Core Statements'
  },
  incomeStatement: {
    id: 'income-statement',
    name: 'Income Statement (Statement of Comprehensive Income)',
    description: 'Summarizes revenues, expenses, and profit/loss over a period',
    category: 'Core Statements'
  },
  cashFlowStatement: {
    id: 'cash-flow',
    name: 'Cash Flow Statement',
    description: 'Shows cash inflows and outflows from operating, investing, and financing activities',
    category: 'Core Statements'
  },
  changesInEquity: {
    id: 'changes-equity',
    name: 'Statement of Changes in Equity',
    description: 'Details movements in equity over a reporting period',
    category: 'Core Statements'
  },
  // Additional Reports
  trialBalance: {
    id: 'trial-balance',
    name: 'Trial Balance',
    description: 'Lists all general ledger accounts with debit/credit balances',
    category: 'Accounting Reports'
  },
  generalLedger: {
    id: 'general-ledger',
    name: 'General Ledger (GL)',
    description: 'Detailed record of all financial transactions grouped by account',
    category: 'Accounting Reports'
  },
  accountsReceivable: {
    id: 'accounts-receivable',
    name: 'Accounts Receivable (Debtors) Summary',
    description: 'Shows amounts owed by customers',
    category: 'Accounting Reports'
  },
  accountsPayable: {
    id: 'accounts-payable',
    name: 'Accounts Payable (Creditors) Summary',
    description: 'Shows amounts owed to suppliers',
    category: 'Accounting Reports'
  },
  fixedAssetRegister: {
    id: 'fixed-asset',
    name: 'Fixed Asset Register',
    description: 'Tracks assets, purchase costs, depreciation, and net book value',
    category: 'Accounting Reports'
  },
  budgetVsActual: {
    id: 'budget-actual',
    name: 'Budget vs. Actual Report',
    description: 'Compares planned figures to actual performance',
    category: 'Management Reports'
  },
  departmentPerformance: {
    id: 'department-performance',
    name: 'Statement of Financial Performance by Department/Segment',
    description: 'Breaks down income and expenses by business unit or project',
    category: 'Management Reports'
  },
  notesToFinancials: {
    id: 'notes-financials',
    name: 'Notes to the Financial Statements',
    description: 'Detailed explanations, accounting policies, and supporting data',
    category: 'Management Reports'
  }
};

const Reports = () => {
  const { company } = useAuth();
  const { formatCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [selectedReportType, setSelectedReportType] = useState('income-statement');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    asOfDate: new Date().toISOString().split('T')[0] // For balance sheet
  });

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  const handleReportTypeChange = (e) => {
    setSelectedReportType(e.target.value);
    setReportData(null); // Clear previous report when changing type
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const reportConfig = REPORT_TYPES[selectedReportType];
      const reportType = reportConfig?.id || selectedReportType;
      
      // Prepare params - balance sheet uses asOfDate, others use startDate/endDate
      const params = reportType === 'balance-sheet' 
        ? { asOfDate: dateRange.asOfDate }
        : { startDate: dateRange.startDate, endDate: dateRange.endDate };
      
      const response = await axios.get(`/api/dashboard/reports/${reportType}`, {
        params
      });
      setReportData({
        ...response.data,
        reportType: selectedReportType,
        reportName: reportConfig?.name || 'Report'
      });
    } catch (error) {
      console.error('Report generation error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to generate report';
      toast.error(errorMessage);
      console.error('Full error response:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReportEmail = async () => {
    if (!reportData) {
      toast.error('Please generate a report first');
      return;
    }

    const email = prompt('Enter email address(es) to send the report to (separate multiple emails with commas):');
    if (!email || !email.trim()) {
      return;
    }

    try {
      const reportConfig = REPORT_TYPES[selectedReportType];
      const reportType = reportConfig?.id || selectedReportType;
      
      const params = reportType === 'balance-sheet' 
        ? { asOfDate: dateRange.asOfDate }
        : { startDate: dateRange.startDate, endDate: dateRange.endDate };

      await axios.post('/api/dashboard/reports/send-email', {
        reportType,
        reportName: reportConfig?.name || 'Financial Report',
        emails: email.split(',').map(e => e.trim()).filter(e => e),
        dateRange,
        params
      });
      toast.success('Financial report sent via email successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send report email');
    }
  };

  const selectedReport = REPORT_TYPES[selectedReportType] || REPORT_TYPES.incomeStatement;

  // Group reports by category for better organization
  const reportsByCategory = Object.values(REPORT_TYPES).reduce((acc, report) => {
    if (!acc[report.category]) {
      acc[report.category] = [];
    }
    acc[report.category].push(report);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Financial Reports</h1>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Report Configuration</h3>
        </div>

        <div className="form-group">
          <label className="form-label">Report Type *</label>
          <select
            className="form-control"
            value={selectedReportType}
            onChange={handleReportTypeChange}
            style={{ fontSize: '16px', padding: '12px' }}
          >
            {Object.entries(reportsByCategory).map(([category, reports]) => (
              <optgroup key={category} label={category}>
                {reports.map(report => {
                  // Find the key in REPORT_TYPES that matches this report's id
                  const reportKey = Object.keys(REPORT_TYPES).find(key => REPORT_TYPES[key].id === report.id);
                  return (
                    <option key={report.id} value={reportKey || report.id}>
                      {report.name}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
          {selectedReport.description && (
            <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              {selectedReport.description}
            </p>
          )}
        </div>

        <div className="grid grid-3">
          {REPORT_TYPES[selectedReportType]?.id === 'balance-sheet' ? (
            <>
              <div className="form-group">
                <label className="form-label">As Of Date *</label>
                <input
                  type="date"
                  name="asOfDate"
                  className="form-control"
                  value={dateRange.asOfDate}
                  onChange={handleDateChange}
                />
              </div>
              <div className="form-group"></div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  className="form-control"
                  value={dateRange.startDate}
                  onChange={handleDateChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  className="form-control"
                  value={dateRange.endDate}
                  onChange={handleDateChange}
                />
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">&nbsp;</label>
            <button 
              className="btn btn-primary" 
              onClick={generateReport}
              disabled={loading}
              style={{ width: '100%' }}
            >
              <BarChart3 size={18} />
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

              {reportData && (
                <ReportDisplayWrapper
                  reportData={reportData}
                  dateRange={dateRange}
                  selectedReportType={selectedReportType}
                  company={company}
                  onSendEmail={handleSendReportEmail}
                />
              )}
    </div>
  );
};

// Report Display Component
// Report Display Wrapper with PDF download
const ReportDisplayWrapper = ({ reportData, dateRange, selectedReportType, company, onSendEmail }) => {
  const pdfRef = useRef(null);

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) {
      toast.error('Report not ready for PDF generation');
      return;
    }

    try {
      const element = pdfRef.current;
      const reportConfig = REPORT_TYPES[selectedReportType];
      const reportName = reportConfig?.name || 'Report';
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${reportName.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      // Hide action buttons temporarily
      const buttons = element.querySelectorAll('.btn');
      buttons.forEach(btn => btn.style.display = 'none');

      await html2pdf().set(opt).from(element).save();

      // Restore buttons
      buttons.forEach(btn => btn.style.display = '');

      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Trying print dialog instead...');
      window.print();
    }
  };

  return (
    <>
      <div style={{ marginBottom: '20px', textAlign: 'right' }}>
        <button
          className="btn btn-primary"
          onClick={onSendEmail}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}
        >
          <Mail size={18} /> Send Report via Email
        </button>
      </div>
      <div ref={pdfRef}>
        <ReportDisplay 
          reportData={reportData} 
          dateRange={dateRange}
          selectedReportType={selectedReportType}
          company={company}
          onDownloadPDF={handleDownloadPDF}
        />
      </div>
    </>
  );
};

const ReportDisplay = ({ reportData, dateRange, selectedReportType, company, onDownloadPDF }) => {
  const { formatCurrency, currencySymbol } = useCurrency();
  
  // Get the report type ID from the report data
  const reportTypeId = reportData?.reportType || selectedReportType;
  const reportConfig = REPORT_TYPES[reportTypeId];
  const actualReportId = reportConfig?.id || reportTypeId;
  
  // Render based on report type
  switch (actualReportId) {
    case 'income-statement':
      return <IncomeStatementReport data={reportData} dateRange={dateRange} company={company} onDownloadPDF={onDownloadPDF} formatCurrency={formatCurrency} currencySymbol={currencySymbol} />;
    case 'balance-sheet':
      return <BalanceSheetReport data={reportData} dateRange={dateRange} company={company} onDownloadPDF={onDownloadPDF} formatCurrency={formatCurrency} currencySymbol={currencySymbol} />;
    case 'cash-flow':
      return <CashFlowReport data={reportData} dateRange={dateRange} company={company} onDownloadPDF={onDownloadPDF} formatCurrency={formatCurrency} currencySymbol={currencySymbol} />;
    case 'accounts-receivable':
      return <AccountsReceivableReport data={reportData} dateRange={dateRange} company={company} onDownloadPDF={onDownloadPDF} formatCurrency={formatCurrency} currencySymbol={currencySymbol} />;
    case 'accounts-payable':
      return <AccountsPayableReport data={reportData} dateRange={dateRange} company={company} onDownloadPDF={onDownloadPDF} formatCurrency={formatCurrency} currencySymbol={currencySymbol} />;
    case 'trial-balance':
      return <TrialBalanceReport data={reportData} dateRange={dateRange} company={company} onDownloadPDF={onDownloadPDF} formatCurrency={formatCurrency} currencySymbol={currencySymbol} />;
    case 'fixed-asset':
      return <FixedAssetReport data={reportData} dateRange={dateRange} company={company} onDownloadPDF={onDownloadPDF} formatCurrency={formatCurrency} currencySymbol={currencySymbol} />;
    case 'budget-actual':
      return <BudgetVsActualReport data={reportData} dateRange={dateRange} company={company} onDownloadPDF={onDownloadPDF} formatCurrency={formatCurrency} currencySymbol={currencySymbol} />;
    case 'department-performance':
      return <DepartmentPerformanceReport data={reportData} dateRange={dateRange} company={company} onDownloadPDF={onDownloadPDF} formatCurrency={formatCurrency} currencySymbol={currencySymbol} />;
    case 'notes-financials':
      return <NotesToFinancialsReport data={reportData} dateRange={dateRange} company={company} onDownloadPDF={onDownloadPDF} formatCurrency={formatCurrency} currencySymbol={currencySymbol} />;
    default:
      return <GenericReportDisplay data={reportData} dateRange={dateRange} company={company} onDownloadPDF={onDownloadPDF} formatCurrency={formatCurrency} currencySymbol={currencySymbol} />;
  }
};

// Income Statement Component (existing)
const IncomeStatementReport = ({ data, dateRange, company, onDownloadPDF, formatCurrency, currencySymbol }) => {
  const { formatCurrency: defaultFormatCurrency } = useCurrency();
  const formatter = formatCurrency || defaultFormatCurrency;
  
  return (
    <>
      <ReportHeader onDownloadPDF={onDownloadPDF} 
        title="Income Statement" 
        subtitle="Statement of Comprehensive Income"
        dateRange={dateRange}
        company={company}
        onDownloadPDF={onDownloadPDF}
      />
    
    <div className="grid grid-3">
      <StatCard 
        label="Total Income"
        value={data.totalIncome}
        color="success"
        icon={<DollarSign size={28} />}
        formatCurrency={formatter}
      />
      <StatCard 
        label="Total Expenses"
        value={data.totalExpenses}
        color="danger"
        icon={<TrendingUp size={28} />}
        formatCurrency={formatter}
      />
      <StatCard 
        label="Net Income"
        value={data.netIncome}
        color={data.netIncome >= 0 ? "success" : "danger"}
        icon={<FileText size={28} />}
        formatCurrency={formatter}
      />
    </div>

    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Income Statement Summary</h3>
      </div>
      <div style={{ maxWidth: '600px' }}>
        <div className="flex-between" style={{ padding: '16px', backgroundColor: 'var(--light-color)', marginBottom: '8px', borderRadius: '8px' }}>
          <span style={{ fontWeight: 600 }}>Total Income (Revenue)</span>
          <span style={{ fontWeight: 700, color: 'var(--success-color)', fontSize: '18px' }}>
            {formatter(data.totalIncome || 0)}
          </span>
        </div>
        <div className="flex-between" style={{ padding: '16px', backgroundColor: 'var(--light-color)', marginBottom: '8px', borderRadius: '8px' }}>
          <span style={{ fontWeight: 600 }}>Total Expenses</span>
          <span style={{ fontWeight: 700, color: 'var(--danger-color)', fontSize: '18px' }}>
            {formatter(data.totalExpenses || 0)}
          </span>
        </div>
        <div className="flex-between" style={{ 
          padding: '20px', 
          backgroundColor: data.netIncome >= 0 ? '#d1fae5' : '#fee2e2',
          marginTop: '16px',
          borderRadius: '8px'
        }}>
          <span style={{ fontWeight: 700, fontSize: '18px' }}>Net Income (Profit/Loss)</span>
          <span style={{ 
            fontWeight: 700, 
            fontSize: '24px',
            color: data.netIncome >= 0 ? 'var(--success-color)' : 'var(--danger-color)'
          }}>
            {formatter(data.netIncome || 0)}
          </span>
        </div>
      </div>
    </div>

    {data.expensesByCategory && data.expensesByCategory.length > 0 && (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Expenses by Category</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.expensesByCategory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip formatter={(value) => formatter(value)} />
            <Legend />
            <Bar dataKey="total" fill="var(--danger-color)" name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
    </>
  );
};

// Balance Sheet Component
const BalanceSheetReport = ({ data, dateRange, company, onDownloadPDF, formatCurrency, currencySymbol }) => {
  const { formatCurrency: defaultFormatCurrency } = useCurrency();
  const formatter = formatCurrency || defaultFormatCurrency;
  
  if (!data) {
    return <div className="card"><p>No data available</p></div>;
  }
  
  return (
    <>
      <ReportHeader onDownloadPDF={onDownloadPDF} 
        title="Balance Sheet" 
        subtitle="Statement of Financial Position"
        dateRange={dateRange}
        company={company}
        asOfDate={dateRange.asOfDate}
      />
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Assets</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Account</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.assets && data.assets.length > 0 ? (
                <>
                  {data.assets.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.account}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatter(item.amount || 0)}
                      </td>
                    </tr>
                  ))}
                  {data.totalAssets !== undefined && (
                    <tr style={{ backgroundColor: 'var(--light-color)', fontWeight: 700 }}>
                      <td>Total Assets</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatter(data.totalAssets || 0)}
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No asset data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Liabilities</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Account</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.liabilities && data.liabilities.length > 0 ? (
                <>
                  {data.liabilities.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.account}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatter(item.amount || 0)}
                      </td>
                    </tr>
                  ))}
                  {data.totalLiabilities !== undefined && (
                    <tr style={{ backgroundColor: 'var(--light-color)', fontWeight: 700 }}>
                      <td>Total Liabilities</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatter(data.totalLiabilities || 0)}
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No liability data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Equity</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Account</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.equity && data.equity.length > 0 ? (
                <>
                  {data.equity.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.account}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatter(item.amount || 0)}
                      </td>
                    </tr>
                  ))}
                  {data.totalEquity !== undefined && (
                    <tr style={{ backgroundColor: 'var(--light-color)', fontWeight: 700 }}>
                      <td>Total Equity</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatter(data.totalEquity || 0)}
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No equity data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(data.totalAssets !== undefined || data.totalLiabilities !== undefined || data.totalEquity !== undefined) && (
        <div className="card">
          <div className="flex-between" style={{ padding: '20px', backgroundColor: '#d1fae5', borderRadius: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '20px' }}>Total Assets = Total Liabilities + Equity</span>
            <span style={{ fontWeight: 700, fontSize: '20px', color: 'var(--success-color)' }}>
              {formatter(data.totalAssets || 0)}
              {' = '}
              {formatter((data.totalLiabilities || 0) + (data.totalEquity || 0))}
            </span>
          </div>
        </div>
      )}
    </>
  );
};

// Cash Flow Statement Component
const CashFlowReport = ({ data, dateRange, company, onDownloadPDF, formatCurrency, currencySymbol }) => {
  const { formatCurrency: defaultFormatCurrency } = useCurrency();
  const formatter = formatCurrency || defaultFormatCurrency;
  
  if (!data) {
    return <div className="card"><p>No data available</p></div>;
  }
  
  return (
    <>
      <ReportHeader onDownloadPDF={onDownloadPDF} 
        title="Cash Flow Statement" 
        dateRange={dateRange}
        company={company}
      />
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Operating Activities</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.operatingActivities && data.operatingActivities.length > 0 ? (
                <>
                  {data.operatingActivities.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatter(item.amount || 0)}
                      </td>
                    </tr>
                  ))}
                  {data.netOperatingCash !== undefined && (
                    <tr style={{ backgroundColor: 'var(--light-color)', fontWeight: 700 }}>
                      <td>Net Cash from Operating Activities</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatter(data.netOperatingCash || 0)}
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No operating activities data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Investing Activities</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.investingActivities && data.investingActivities.length > 0 ? (
                <>
                  {data.investingActivities.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatter(item.amount || 0)}
                      </td>
                    </tr>
                  ))}
                  {data.netInvestingCash !== undefined && (
                    <tr style={{ backgroundColor: 'var(--light-color)', fontWeight: 700 }}>
                      <td>Net Cash from Investing Activities</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatter(data.netInvestingCash || 0)}
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No investing activities data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Financing Activities</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.financingActivities && data.financingActivities.length > 0 ? (
                <>
                  {data.financingActivities.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatter(item.amount || 0)}
                      </td>
                    </tr>
                  ))}
                  {data.netFinancingCash !== undefined && (
                    <tr style={{ backgroundColor: 'var(--light-color)', fontWeight: 700 }}>
                      <td>Net Cash from Financing Activities</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatter(data.netFinancingCash || 0)}
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No financing activities data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data.netChangeInCash !== undefined && (
        <div className="card">
          <div className="flex-between" style={{ padding: '20px', backgroundColor: '#d1fae5', borderRadius: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '20px' }}>Net Change in Cash</span>
            <span style={{ fontWeight: 700, fontSize: '24px', color: 'var(--success-color)' }}>
              {formatter(data.netChangeInCash || 0)}
            </span>
          </div>
        </div>
      )}
    </>
  );
};

// Accounts Receivable Report
const AccountsReceivableReport = ({ data, dateRange, company, onDownloadPDF, formatCurrency, currencySymbol }) => {
  const { formatCurrency: defaultFormatCurrency } = useCurrency();
  const formatter = formatCurrency || defaultFormatCurrency;
  
  if (!data) {
    return <div className="card"><p>No data available</p></div>;
  }
  
  return (
    <>
      <ReportHeader onDownloadPDF={onDownloadPDF} 
        title="Accounts Receivable Summary" 
        subtitle="Debtors Summary"
        dateRange={dateRange}
        company={company}
      />
      
      <StatCard 
        label="Total Accounts Receivable"
        value={data.totalReceivable || 0}
        color="info"
        icon={<DollarSign size={28} />}
        formatCurrency={formatter}
      />

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Outstanding Invoices</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Due Date</th>
                <th style={{ textAlign: 'right' }}>Amount Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices && data.invoices.length > 0 ? (
                data.invoices.map((invoice, idx) => (
                  <tr key={idx}>
                    <td>{invoice.customer_name}</td>
                    <td>{invoice.invoice_number}</td>
                    <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                    <td>{new Date(invoice.due_date).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatter(invoice.amount_due || 0)}
                    </td>
                    <td>
                      <span className={`badge badge-${invoice.status === 'overdue' ? 'danger' : 'warning'}`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No outstanding invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// Accounts Payable Report
const AccountsPayableReport = ({ data, dateRange, company, onDownloadPDF, formatCurrency, currencySymbol }) => {
  const { formatCurrency: defaultFormatCurrency } = useCurrency();
  const formatter = formatCurrency || defaultFormatCurrency;
  
  if (!data) {
    return <div className="card"><p>No data available</p></div>;
  }
  
  return (
    <>
      <ReportHeader onDownloadPDF={onDownloadPDF} 
        title="Accounts Payable Summary" 
        subtitle="Creditors Summary"
        dateRange={dateRange}
        company={company}
      />
      
      <StatCard 
        label="Total Accounts Payable"
        formatCurrency={formatter}
        value={data.totalPayable || 0}
        color="warning"
        icon={<DollarSign size={28} />}
      />

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Outstanding Bills</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Bill #</th>
                <th>Date</th>
                <th>Due Date</th>
                <th style={{ textAlign: 'right' }}>Amount Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.bills && data.bills.length > 0 ? (
                data.bills.map((bill, idx) => (
                  <tr key={idx}>
                    <td>{bill.supplier_name || bill.category || 'N/A'}</td>
                    <td>{bill.bill_number || bill.description || 'N/A'}</td>
                    <td>{bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : 'N/A'}</td>
                    <td>{bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatter(bill.amount_due || 0)}
                    </td>
                    <td>
                      <span className={`badge badge-${bill.status === 'overdue' ? 'danger' : 'warning'}`}>
                        {bill.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No outstanding bills found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// Trial Balance Report
const TrialBalanceReport = ({ data, dateRange, company, onDownloadPDF, formatCurrency, currencySymbol }) => {
  const { formatCurrency: defaultFormatCurrency } = useCurrency();
  const formatter = formatCurrency || defaultFormatCurrency;
  
  if (!data) {
    return <div className="card"><p>No data available</p></div>;
  }
  
  return (
    <>
      <ReportHeader onDownloadPDF={onDownloadPDF} 
        title="Trial Balance" 
        dateRange={dateRange}
        company={company}
      />
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">General Ledger Accounts</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Account Code</th>
                <th>Account Name</th>
                <th style={{ textAlign: 'right' }}>Debit</th>
                <th style={{ textAlign: 'right' }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts && data.accounts.length > 0 ? (
                <>
                  {data.accounts.map((account, idx) => (
                    <tr key={idx}>
                      <td>{account.code}</td>
                      <td>{account.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {parseFloat(account.debit || 0) > 0 ? `${formatter(account.debit)}` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {parseFloat(account.credit || 0) > 0 ? `${formatter(account.credit)}` : '-'}
                      </td>
                    </tr>
                  ))}
                  {(data.totalDebit !== undefined || data.totalCredit !== undefined) && (
                    <tr style={{ backgroundColor: 'var(--light-color)', fontWeight: 700 }}>
                      <td colSpan="2">Total</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatter(data.totalDebit || 0)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {formatter(data.totalCredit || 0)}
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No account data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// Fixed Asset Register Report
const FixedAssetReport = ({ data, dateRange, company, onDownloadPDF, formatCurrency, currencySymbol }) => {
  const { formatCurrency: defaultFormatCurrency } = useCurrency();
  const formatter = formatCurrency || defaultFormatCurrency;
  
  if (!data || !data.assets) {
    return <div className="card"><p>No asset data available</p></div>;
  }
  
  return (
    <>
      <ReportHeader onDownloadPDF={onDownloadPDF} 
        title="Fixed Asset Register" 
        dateRange={dateRange}
        company={company}
        asOfDate={data.asOfDate}
      />
      
      {data.totals && (
        <div className="grid grid-3">
          <StatCard 
            label="Total Purchase Cost"
            value={data.totals.total_cost || 0}
            color="info"
            icon={<DollarSign size={28} />}
            formatCurrency={formatter}
          />
          <StatCard 
            label="Accumulated Depreciation"
            value={data.totals.total_depreciation || 0}
            color="warning"
            icon={<TrendingUp size={28} />}
            formatCurrency={formatter}
          />
          <StatCard 
            label="Net Book Value"
            value={data.totals.total_net_book_value || 0}
            color="success"
            icon={<DollarSign size={28} />}
            formatCurrency={formatter}
          />
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Fixed Assets</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Asset Code</th>
                <th>Asset Name</th>
                <th>Category</th>
                <th>Purchase Date</th>
                <th style={{ textAlign: 'right' }}>Purchase Cost</th>
                <th style={{ textAlign: 'right' }}>Accumulated Depreciation</th>
                <th style={{ textAlign: 'right' }}>Net Book Value</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {data.assets && data.assets.length > 0 ? (
                data.assets.map((asset, idx) => (
                  <tr key={idx}>
                    <td>{asset.asset_code || '-'}</td>
                    <td>{asset.asset_name}</td>
                    <td>{asset.asset_category || '-'}</td>
                    <td>{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatter(asset.purchase_cost || 0)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatter(asset.accumulated_depreciation || 0)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatter(asset.net_book_value || 0)}
                    </td>
                    <td>{asset.location || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No fixed assets found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// Budget vs Actual Report
const BudgetVsActualReport = ({ data, dateRange, company, onDownloadPDF, formatCurrency, currencySymbol }) => {
  const { formatCurrency: defaultFormatCurrency } = useCurrency();
  const formatter = formatCurrency || defaultFormatCurrency;
  
  if (!data || !data.comparison) {
    return <div className="card"><p>No budget comparison data available</p></div>;
  }
  
  return (
    <>
      <ReportHeader onDownloadPDF={onDownloadPDF} 
        title="Budget vs. Actual Report" 
        dateRange={dateRange}
        company={company}
      />
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Budget vs Actual Comparison</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Budgeted</th>
                <th style={{ textAlign: 'right' }}>Actual</th>
                <th style={{ textAlign: 'right' }}>Variance</th>
                <th style={{ textAlign: 'right' }}>Variance %</th>
              </tr>
            </thead>
            <tbody>
              {data.comparison && data.comparison.length > 0 ? (
                data.comparison.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{item.category}</td>
                    <td style={{ textAlign: 'right' }}>
                      {formatter(item.budgeted || 0)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatter(item.actual || 0)}
                    </td>
                    <td style={{ 
                      textAlign: 'right', 
                      fontWeight: 600,
                      color: item.variance >= 0 ? 'var(--success-color)' : 'var(--danger-color)'
                    }}>
                      {formatter(item.variance || 0)}
                    </td>
                    <td style={{ 
                      textAlign: 'right',
                      color: item.variance >= 0 ? 'var(--success-color)' : 'var(--danger-color)'
                    }}>
                      {parseFloat(item.variancePercent || 0).toFixed(2)}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No budget data available. Please create budgets to see comparison.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// Department Performance Report
const DepartmentPerformanceReport = ({ data, dateRange, company, onDownloadPDF, formatCurrency, currencySymbol }) => {
  const { formatCurrency: defaultFormatCurrency } = useCurrency();
  const formatter = formatCurrency || defaultFormatCurrency;
  
  if (!data || !data.performance) {
    return <div className="card"><p>No department performance data available</p></div>;
  }
  
  return (
    <>
      <ReportHeader onDownloadPDF={onDownloadPDF} 
        title="Statement of Financial Performance by Department/Segment" 
        dateRange={dateRange}
        company={company}
      />
      
      {data.performance && data.performance.map((dept, idx) => (
        <div key={idx} className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">{dept.departmentName}</h3>
            {dept.departmentCode && <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Code: {dept.departmentCode}</p>}
          </div>
          
          <div className="grid grid-3" style={{ marginBottom: '20px' }}>
            <StatCard 
              label="Total Income"
              value={dept.totalIncome || 0}
              color="success"
              icon={<DollarSign size={28} />}
              formatCurrency={formatter}
            />
            <StatCard 
              label="Total Expenses"
              value={dept.totalExpenses || 0}
              color="danger"
              icon={<DollarSign size={28} />}
              formatCurrency={formatter}
            />
            <StatCard 
              label="Net Income"
              value={dept.netIncome || 0}
              color={dept.netIncome >= 0 ? 'success' : 'danger'}
              icon={<TrendingUp size={28} />}
              formatCurrency={formatter}
            />
          </div>

          {dept.expensesByCategory && dept.expensesByCategory.length > 0 && (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Expense Category</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {dept.expensesByCategory.map((exp, expIdx) => (
                    <tr key={expIdx}>
                      <td>{exp.category}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatter(exp.amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </>
  );
};

// Notes to Financial Statements Report
const NotesToFinancialsReport = ({ data, dateRange, company, onDownloadPDF, formatCurrency, currencySymbol }) => {
  const { formatCurrency: defaultFormatCurrency } = useCurrency();
  const formatter = formatCurrency || defaultFormatCurrency;
  
  if (!data) {
    return <div className="card"><p>No notes data available</p></div>;
  }
  
  return (
    <>
      <ReportHeader onDownloadPDF={onDownloadPDF} 
        title="Notes to the Financial Statements" 
        dateRange={dateRange}
        company={company}
      />
      
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>1. Company Information</h3>
        <div style={{ marginLeft: '20px', marginBottom: '24px' }}>
          <p><strong>Company Name:</strong> {data.companyInformation?.name || 'N/A'}</p>
          <p><strong>Email:</strong> {data.companyInformation?.email || 'N/A'}</p>
          <p><strong>Address:</strong> {data.companyInformation?.address || 'N/A'}</p>
          {(data.companyInformation?.city || data.companyInformation?.state || data.companyInformation?.country) && (
            <p><strong>Location:</strong> {[data.companyInformation.city, data.companyInformation.state, data.companyInformation.country].filter(Boolean).join(', ')}</p>
          )}
          {data.companyInformation?.taxNumber && (
            <p><strong>Tax Number:</strong> {data.companyInformation.taxNumber}</p>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>2. Accounting Policies</h3>
        <div style={{ marginLeft: '20px', marginBottom: '24px' }}>
          <p><strong>Reporting Period:</strong> {data.accountingPolicies?.reportingPeriod?.startDate ? new Date(data.accountingPolicies.reportingPeriod.startDate).toLocaleDateString() : 'N/A'} to {data.accountingPolicies?.reportingPeriod?.endDate ? new Date(data.accountingPolicies.reportingPeriod.endDate).toLocaleDateString() : 'N/A'}</p>
          <p><strong>Currency:</strong> {data.accountingPolicies?.currency || 'USD'}</p>
          <p><strong>Revenue Recognition:</strong> {data.accountingPolicies?.revenueRecognition || 'N/A'}</p>
          <p><strong>Expense Recognition:</strong> {data.accountingPolicies?.expenseRecognition || 'N/A'}</p>
          <p><strong>Depreciation Method:</strong> {data.accountingPolicies?.depreciationMethod || 'N/A'}</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>3. Revenue</h3>
        <div style={{ marginLeft: '20px', marginBottom: '24px' }}>
          <p><strong>Total Revenue:</strong> {formatter(data.revenue?.totalRevenue || 0)}</p>
          <p><strong>Invoices Issued:</strong> {data.revenue?.invoicesIssued || 0}</p>
          <p><strong>Total Received:</strong> {formatter(data.revenue?.totalReceived || 0)}</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>4. Expenses</h3>
        <div style={{ marginLeft: '20px', marginBottom: '24px' }}>
          <p><strong>Total Expenses:</strong> {formatter(data.expenses?.totalExpenses || 0)}</p>
          <p><strong>Expense Categories:</strong> {data.expenses?.expenseCategories || 0}</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>5. Assets</h3>
        <div style={{ marginLeft: '20px', marginBottom: '24px' }}>
          <p><strong>Number of Fixed Assets:</strong> {data.assets?.assetCount || 0}</p>
          <p><strong>Total Cost:</strong> {formatter(data.assets?.totalCost || 0)}</p>
          <p><strong>Net Book Value:</strong> {formatter(data.assets?.netBookValue || 0)}</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>6. Receivables and Payables</h3>
        <div style={{ marginLeft: '20px', marginBottom: '24px' }}>
          <p><strong>Total Accounts Receivable:</strong> {formatter(data.receivables?.totalReceivable || 0)}</p>
          <p><strong>Total Accounts Payable:</strong> {formatter(data.payables?.totalPayable || 0)}</p>
        </div>
      </div>
    </>
  );
};

// Generic Report Display (fallback)
const GenericReportDisplay = ({ data, dateRange, company, onDownloadPDF, formatCurrency, currencySymbol }) => {
  const { formatCurrency: defaultFormatCurrency } = useCurrency();
  const formatter = formatCurrency || defaultFormatCurrency;
  
  return (
  <>
    <ReportHeader onDownloadPDF={onDownloadPDF} 
      title={data.reportName || "Report"} 
      dateRange={dateRange}
      company={company}
    />
    
    <div className="card">
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
    </>
  );
};

// Report Header Component (with logo)
const ReportHeader = ({ title, subtitle, dateRange, company, asOfDate, onDownloadPDF }) => (
  <div className="card" style={{ backgroundColor: 'white', marginBottom: '24px' }}>
    <div style={{ padding: '32px', textAlign: 'center', borderBottom: '2px solid var(--border-color)' }}>
      {company?.logoUrl || company?.logo_url ? (
        <img 
          src={company.logoUrl || company.logo_url} 
          alt={company?.name || 'Company Logo'}
          style={{ 
            maxHeight: '80px', 
            maxWidth: '200px', 
            marginBottom: '16px',
            objectFit: 'contain'
          }}
        />
      ) : null}
      <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>{title}</h1>
      {subtitle && <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{subtitle}</p>}
      <div style={{ marginTop: '16px' }}>
        <p style={{ fontSize: '16px', fontWeight: 600 }}>{company?.name || 'Company Name'}</p>
        {asOfDate ? (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            As of {new Date(asOfDate).toLocaleDateString()}
          </p>
        ) : (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Period: {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
    
    <div className="card-header flex-between" style={{ padding: '16px 32px' }}>
      <div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </p>
      </div>
      <button className="btn btn-outline" onClick={onDownloadPDF || (() => window.print())}>
        <Download size={18} /> Download PDF
      </button>
    </div>
  </div>
);

// Stat Card Component
const StatCard = ({ label, value, color, icon, formatCurrency }) => {
  const { formatCurrency: defaultFormatCurrency } = useCurrency();
  const formatter = formatCurrency || defaultFormatCurrency;
  
  const colorMap = {
    success: { bg: '#d1fae5', text: '#10b981' },
    danger: { bg: '#fee2e2', text: '#ef4444' },
    info: { bg: '#dbeafe', text: '#3b82f6' },
    warning: { bg: '#fef3c7', text: '#f59e0b' }
  };
  const colors = colorMap[color] || colorMap.info;
  
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '12px', 
          backgroundColor: colors.bg,
          color: colors.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            {label}
          </p>
          <h3 style={{ fontSize: '28px', fontWeight: 700, color: colors.text }}>
            {formatter(value || 0)}
          </h3>
        </div>
      </div>
    </div>
  );
};

export default Reports;
