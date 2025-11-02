import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Edit2, Trash2, ArrowLeft, Download, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import html2pdf from 'html2pdf.js';

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useAuth();
  const { formatCurrency } = useCurrency();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await axios.get(`/api/invoices/${id}`);
      setInvoice(response.data);
    } catch (error) {
      toast.error('Failed to fetch invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await axios.delete(`/api/invoices/${id}`);
        toast.success('Invoice deleted successfully');
        navigate('/invoices');
      } catch (error) {
        toast.error('Failed to delete invoice');
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) {
      toast.error('Document not ready for PDF generation');
      return;
    }

    try {
      const element = pdfRef.current;
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `Invoice-${invoice.invoice_number}-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      // Hide action buttons and page header temporarily
      const buttons = element.querySelectorAll('.btn');
      const pageHeader = document.querySelector('.page-header');
      const headerDisplay = pageHeader ? pageHeader.style.display : '';
      
      buttons.forEach(btn => btn.style.display = 'none');
      if (pageHeader) pageHeader.style.display = 'none';

      // Get only the document content
      const docContent = element.querySelector('.document-header');
      
      await html2pdf().set(opt).from(docContent || element).save();

      // Restore buttons and header
      buttons.forEach(btn => btn.style.display = '');
      if (pageHeader) pageHeader.style.display = headerDisplay;

      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Trying print dialog instead...');
      window.print();
    }
  };

  const handleSendEmail = async () => {
    try {
      const invoiceUrl = `${window.location.origin}/invoices/${invoice.id}`;
      await axios.post(`/api/invoices/${invoice.id}/send-email`, {
        to: invoice.email || invoice.customer_email,
        invoiceUrl
      });
      toast.success('Invoice sent via email successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send invoice email');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!invoice) {
    return <div className="card">Invoice not found</div>;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'sent': return 'info';
      case 'overdue': return 'danger';
      case 'draft': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-outline" onClick={() => navigate('/invoices')}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="flex gap-1">
          <Link to={`/invoices/${id}/edit`} className="btn btn-outline">
            <Edit2 size={18} /> Edit
          </Link>
          <button className="btn btn-outline" onClick={handleSendEmail}>
            <Mail size={18} /> Email
          </button>
          <button className="btn btn-outline" onClick={handleDownloadPDF}>
            <Download size={18} /> Download PDF
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            <Trash2 size={18} /> Delete
          </button>
        </div>
      </div>

      <div ref={pdfRef} className="card document-card" style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: 'white' }}>
        {/* Invoice Header */}
        <div className="document-header" style={{ padding: '40px', backgroundColor: 'white' }}>
          <div className="flex-between" style={{ marginBottom: '40px' }}>
            <div>
              {company?.logoUrl || company?.logo_url ? (
                <img 
                  src={company.logoUrl || company.logo_url} 
                  alt={company?.name || 'Company Logo'}
                  className="document-logo"
                  style={{ 
                    maxHeight: '80px', 
                    maxWidth: '200px', 
                    marginBottom: '16px',
                    objectFit: 'contain'
                  }}
                />
              ) : null}
              <h1 className="document-title" style={{ fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>
                INVOICE
              </h1>
              <span className={`badge badge-${getStatusColor(invoice.status)}`} style={{ fontSize: '14px' }}>
                {invoice.status.toUpperCase()}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--primary-color)' }}>
                {company?.name}
              </h2>
              {company?.address && (
                <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {company.address}
                </p>
              )}
              {(company?.city || company?.state || company?.country) && (
                <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {[company.city, company.state, company.country].filter(Boolean).join(', ')}
                </p>
              )}
              <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                {company?.email}
              </p>
              {company?.phone && (
                <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {company.phone}
                </p>
              )}
            </div>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-2" style={{ marginBottom: '40px', gap: '40px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                BILL TO:
              </h3>
              <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                {invoice.customer_name}
              </h4>
              {invoice.billing_address && (
                <p style={{ margin: '4px 0', fontSize: '14px' }}>{invoice.billing_address}</p>
              )}
              {(invoice.city || invoice.state || invoice.postal_code) && (
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  {[invoice.city, invoice.state, invoice.postal_code].filter(Boolean).join(', ')}
                </p>
              )}
              {invoice.email && (
                <p style={{ margin: '4px 0', fontSize: '14px' }}>{invoice.email}</p>
              )}
              {invoice.phone && (
                <p style={{ margin: '4px 0', fontSize: '14px' }}>{invoice.phone}</p>
              )}
            </div>

            <div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Invoice Number:</span>
                <span style={{ fontSize: '16px', fontWeight: 600, marginLeft: '8px' }}>
                  {invoice.invoice_number}
                </span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Invoice Date:</span>
                <span style={{ fontSize: '16px', marginLeft: '8px' }}>
                  {new Date(invoice.invoice_date).toLocaleDateString()}
                </span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Due Date:</span>
                <span style={{ fontSize: '16px', marginLeft: '8px' }}>
                  {new Date(invoice.due_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <table className="table document-table" style={{ marginBottom: '40px', width: '100%' }}>
            <thead style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
              <tr>
                <th style={{ color: 'white', padding: '12px', textAlign: 'left' }}>Description</th>
                <th style={{ color: 'white', padding: '12px', textAlign: 'center' }}>Qty</th>
                <th style={{ color: 'white', padding: '12px', textAlign: 'right' }}>Price</th>
                <th style={{ color: 'white', padding: '12px', textAlign: 'right' }}>Discount</th>
                <th style={{ color: 'white', padding: '12px', textAlign: 'right' }}>Tax</th>
                <th style={{ color: 'white', padding: '12px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, index) => (
                <tr key={index}>
                  <td style={{ padding: '12px' }}>{item.description}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{parseFloat(item.quantity)}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{parseFloat(item.discount_percent)}%</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{parseFloat(item.tax_rate)}%</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(item.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ maxWidth: '350px', marginLeft: 'auto', marginBottom: '40px' }}>
            <div className="flex-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '15px' }}>Subtotal:</span>
              <span style={{ fontSize: '15px', fontWeight: 600 }}>
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>
            <div className="flex-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '15px' }}>Tax:</span>
              <span style={{ fontSize: '15px', fontWeight: 600 }}>
                {formatCurrency(invoice.tax_amount)}
              </span>
            </div>
            <div className="flex-between" style={{ padding: '16px 0', backgroundColor: 'var(--light-color)', margin: '0 -12px', padding: '16px 12px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700 }}>Total Amount:</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary-color)' }}>
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
            <div className="flex-between" style={{ padding: '12px 0', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '15px' }}>Amount Paid:</span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--success-color)' }}>
                {formatCurrency(invoice.amount_paid || 0)}
              </span>
            </div>
            <div className="flex-between" style={{ padding: '12px 0' }}>
              <span style={{ fontSize: '16px', fontWeight: 700 }}>Amount Due:</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--danger-color)' }}>
                {formatCurrency(invoice.amount_due)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                NOTES:
              </h4>
              <p style={{ fontSize: '14px', lineHeight: '1.6' }}>{invoice.notes}</p>
            </div>
          )}

          {/* Terms */}
          {invoice.terms && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                TERMS & CONDITIONS:
              </h4>
              <p style={{ fontSize: '14px', lineHeight: '1.6' }}>{invoice.terms}</p>
            </div>
          )}

          {/* Bank Account Details */}
          {(company?.bank_name || company?.account_number || company?.iban) && (
            <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                PAYMENT DETAILS:
              </h4>
              <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '4px' }}>
                {company?.bank_name && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-block', minWidth: '140px' }}>
                      Bank Name:
                    </span>
                    <span style={{ fontSize: '13px' }}>{company.bank_name}</span>
                  </div>
                )}
                {company?.account_holder_name && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-block', minWidth: '140px' }}>
                      Account Name:
                    </span>
                    <span style={{ fontSize: '13px' }}>{company.account_holder_name}</span>
                  </div>
                )}
                {company?.account_number && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-block', minWidth: '140px' }}>
                      Account Number:
                    </span>
                    <span style={{ fontSize: '13px' }}>{company.account_number}</span>
                  </div>
                )}
                {company?.routing_number && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-block', minWidth: '140px' }}>
                      Routing Number:
                    </span>
                    <span style={{ fontSize: '13px' }}>{company.routing_number}</span>
                  </div>
                )}
                {company?.swift_bic && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-block', minWidth: '140px' }}>
                      SWIFT/BIC:
                    </span>
                    <span style={{ fontSize: '13px' }}>{company.swift_bic}</span>
                  </div>
                )}
                {company?.iban && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-block', minWidth: '140px' }}>
                      IBAN:
                    </span>
                    <span style={{ fontSize: '13px' }}>{company.iban}</span>
                  </div>
                )}
                {company?.bank_address && (
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-block', minWidth: '140px' }}>
                      Bank Address:
                    </span>
                    <span style={{ fontSize: '13px' }}>{company.bank_address}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;

