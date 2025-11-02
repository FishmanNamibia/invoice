const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'invoice.dynaverseinvestment.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'info@invoice.dynaverseinvestment.com',
        pass: process.env.SMTP_PASSWORD || ''
    }
});

// Verify connection
transporter.verify((error, success) => {
    if (error) {
        console.error('Email service verification error:', error);
    } else {
        console.log('✅ Email service is ready to send messages');
    }
});

// Email templates
const templates = {
    // Invoice email
    invoice: (data) => {
        const { invoice, company, customer, items, invoiceUrl } = data;
        return {
            subject: `Invoice ${invoice.invoice_number} from ${company.name}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9fafb; }
                        .invoice-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 8px; }
                        .item-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                        .total-row { padding: 15px 0; font-weight: bold; font-size: 18px; border-top: 2px solid #4f46e5; }
                        .button { display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Invoice ${invoice.invoice_number}</h1>
                        </div>
                        <div class="content">
                            <p>Dear ${customer.customer_name || customer.name},</p>
                            <p>Please find attached invoice ${invoice.invoice_number} from ${company.name}.</p>
                            
                            <div class="invoice-details">
                                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                                <p><strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
                                <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
                                <p><strong>Status:</strong> ${invoice.status}</p>
                            </div>
                            
                            ${items && items.length > 0 ? `
                                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                    <thead>
                                        <tr style="background-color: #f3f4f6;">
                                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
                                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Quantity</th>
                                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
                                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${items.map(item => `
                                            <tr>
                                                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
                                                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
                                                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${parseFloat(item.unit_price).toFixed(2)}</td>
                                                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${parseFloat(item.line_total).toFixed(2)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : ''}
                            
                            <div class="invoice-details">
                                <p style="text-align: right;"><strong>Subtotal:</strong> $${parseFloat(invoice.subtotal || 0).toFixed(2)}</p>
                                <p style="text-align: right;"><strong>Tax:</strong> $${parseFloat(invoice.tax_amount || 0).toFixed(2)}</p>
                                <p class="total-row" style="text-align: right;"><strong>Total Amount:</strong> $${parseFloat(invoice.total_amount || 0).toFixed(2)}</p>
                                <p style="text-align: right;"><strong>Amount Due:</strong> $${parseFloat(invoice.amount_due || invoice.total_amount || 0).toFixed(2)}</p>
                            </div>
                            
                            ${invoiceUrl ? `<div style="text-align: center;"><a href="${invoiceUrl}" class="button">View Invoice Online</a></div>` : ''}
                            
                            ${invoice.notes ? `<p><strong>Notes:</strong><br>${invoice.notes}</p>` : ''}
                            ${invoice.terms ? `<p><strong>Terms:</strong><br>${invoice.terms}</p>` : ''}
                            
                            <p>Thank you for your business!</p>
                            <p>Best regards,<br>${company.name}</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message from ${company.name}.</p>
                            <p>If you have any questions, please contact us at ${company.email}</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Invoice ${invoice.invoice_number} from ${company.name}
                
                Dear ${customer.customer_name || customer.name},
                
                Please find invoice ${invoice.invoice_number} from ${company.name}.
                
                Invoice Number: ${invoice.invoice_number}
                Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
                Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
                Status: ${invoice.status}
                
                ${items && items.length > 0 ? items.map(item => `- ${item.description}: ${item.quantity} x $${parseFloat(item.unit_price).toFixed(2)} = $${parseFloat(item.line_total).toFixed(2)}`).join('\n') : ''}
                
                Subtotal: $${parseFloat(invoice.subtotal || 0).toFixed(2)}
                Tax: $${parseFloat(invoice.tax_amount || 0).toFixed(2)}
                Total Amount: $${parseFloat(invoice.total_amount || 0).toFixed(2)}
                Amount Due: $${parseFloat(invoice.amount_due || invoice.total_amount || 0).toFixed(2)}
                
                ${invoice.notes ? `Notes: ${invoice.notes}` : ''}
                ${invoice.terms ? `Terms: ${invoice.terms}` : ''}
                
                Thank you for your business!
                
                Best regards,
                ${company.name}
                
                If you have any questions, please contact us at ${company.email}
            `
        };
    },
    
    // Quote email
    quote: (data) => {
        const { quote, company, customer, items, quoteUrl } = data;
        return {
            subject: `Quote ${quote.quote_number} from ${company.name}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9fafb; }
                        .quote-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 8px; }
                        .item-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                        .total-row { padding: 15px 0; font-weight: bold; font-size: 18px; border-top: 2px solid #059669; }
                        .button { display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Quote ${quote.quote_number}</h1>
                        </div>
                        <div class="content">
                            <p>Dear ${customer.customer_name || customer.name},</p>
                            <p>Please find attached quote ${quote.quote_number} from ${company.name}.</p>
                            
                            <div class="quote-details">
                                <p><strong>Quote Number:</strong> ${quote.quote_number}</p>
                                <p><strong>Quote Date:</strong> ${new Date(quote.quote_date).toLocaleDateString()}</p>
                                <p><strong>Expiry Date:</strong> ${new Date(quote.expiry_date).toLocaleDateString()}</p>
                                <p><strong>Status:</strong> ${quote.status}</p>
                            </div>
                            
                            ${items && items.length > 0 ? `
                                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                    <thead>
                                        <tr style="background-color: #f3f4f6;">
                                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
                                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Quantity</th>
                                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
                                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${items.map(item => `
                                            <tr>
                                                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
                                                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
                                                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${parseFloat(item.unit_price).toFixed(2)}</td>
                                                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${parseFloat(item.line_total).toFixed(2)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : ''}
                            
                            <div class="quote-details">
                                <p style="text-align: right;"><strong>Subtotal:</strong> $${parseFloat(quote.subtotal || 0).toFixed(2)}</p>
                                <p style="text-align: right;"><strong>Tax:</strong> $${parseFloat(quote.tax_amount || 0).toFixed(2)}</p>
                                <p class="total-row" style="text-align: right;"><strong>Total Amount:</strong> $${parseFloat(quote.total_amount || 0).toFixed(2)}</p>
                            </div>
                            
                            ${quoteUrl ? `<div style="text-align: center;"><a href="${quoteUrl}" class="button">View Quote Online</a></div>` : ''}
                            
                            ${quote.notes ? `<p><strong>Notes:</strong><br>${quote.notes}</p>` : ''}
                            ${quote.terms ? `<p><strong>Terms:</strong><br>${quote.terms}</p>` : ''}
                            
                            <p>We look forward to your response!</p>
                            <p>Best regards,<br>${company.name}</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message from ${company.name}.</p>
                            <p>If you have any questions, please contact us at ${company.email}</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Quote ${quote.quote_number} from ${company.name}
                
                Dear ${customer.customer_name || customer.name},
                
                Please find quote ${quote.quote_number} from ${company.name}.
                
                Quote Number: ${quote.quote_number}
                Quote Date: ${new Date(quote.quote_date).toLocaleDateString()}
                Expiry Date: ${new Date(quote.expiry_date).toLocaleDateString()}
                Status: ${quote.status}
                
                ${items && items.length > 0 ? items.map(item => `- ${item.description}: ${item.quantity} x $${parseFloat(item.unit_price).toFixed(2)} = $${parseFloat(item.line_total).toFixed(2)}`).join('\n') : ''}
                
                Subtotal: $${parseFloat(quote.subtotal || 0).toFixed(2)}
                Tax: $${parseFloat(quote.tax_amount || 0).toFixed(2)}
                Total Amount: $${parseFloat(quote.total_amount || 0).toFixed(2)}
                
                ${quote.notes ? `Notes: ${quote.notes}` : ''}
                ${quote.terms ? `Terms: ${quote.terms}` : ''}
                
                We look forward to your response!
                
                Best regards,
                ${company.name}
                
                If you have any questions, please contact us at ${company.email}
            `
        };
    },
    
    // Payment receipt email
    paymentReceipt: (data) => {
        const { payment, invoice, company, customer } = data;
        return {
            subject: `Payment Receipt for Invoice ${invoice.invoice_number}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9fafb; }
                        .receipt-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 8px; }
                        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Payment Receipt</h1>
                        </div>
                        <div class="content">
                            <p>Dear ${customer.customer_name || customer.name},</p>
                            <p>Thank you for your payment! We have received your payment for Invoice ${invoice.invoice_number}.</p>
                            
                            <div class="receipt-details">
                                <p><strong>Payment Date:</strong> ${new Date(payment.payment_date).toLocaleDateString()}</p>
                                <p><strong>Payment Amount:</strong> $${parseFloat(payment.amount).toFixed(2)}</p>
                                <p><strong>Payment Method:</strong> ${payment.payment_method || 'N/A'}</p>
                                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                                <p><strong>Transaction Reference:</strong> ${payment.reference_number || payment.id}</p>
                            </div>
                            
                            <p>Your payment has been recorded. Thank you for your business!</p>
                            <p>Best regards,<br>${company.name}</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message from ${company.name}.</p>
                            <p>If you have any questions, please contact us at ${company.email}</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Payment Receipt for Invoice ${invoice.invoice_number}
                
                Dear ${customer.customer_name || customer.name},
                
                Thank you for your payment! We have received your payment for Invoice ${invoice.invoice_number}.
                
                Payment Date: ${new Date(payment.payment_date).toLocaleDateString()}
                Payment Amount: $${parseFloat(payment.amount).toFixed(2)}
                Payment Method: ${payment.payment_method || 'N/A'}
                Invoice Number: ${invoice.invoice_number}
                Transaction Reference: ${payment.reference_number || payment.id}
                
                Your payment has been recorded. Thank you for your business!
                
                Best regards,
                ${company.name}
                
                If you have any questions, please contact us at ${company.email}
            `
        };
    },
    
    // Payment reminder email
    paymentReminder: (data) => {
        const { invoice, company, customer, daysOverdue } = data;
        return {
            subject: `Payment Reminder: Invoice ${invoice.invoice_number}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9fafb; }
                        .reminder-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }
                        .button { display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Payment Reminder</h1>
                        </div>
                        <div class="content">
                            <p>Dear ${customer.customer_name || customer.name},</p>
                            <p>This is a friendly reminder that payment for Invoice ${invoice.invoice_number} is ${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'due soon'}.</p>
                            
                            <div class="reminder-details">
                                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                                <p><strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
                                <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
                                <p><strong>Amount Due:</strong> $${parseFloat(invoice.amount_due || invoice.total_amount || 0).toFixed(2)}</p>
                            </div>
                            
                            <p>Please arrange payment at your earliest convenience. If you have already made this payment, please disregard this reminder.</p>
                            
                            <p>Thank you for your attention to this matter.</p>
                            <p>Best regards,<br>${company.name}</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message from ${company.name}.</p>
                            <p>If you have any questions, please contact us at ${company.email}</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Payment Reminder: Invoice ${invoice.invoice_number}
                
                Dear ${customer.customer_name || customer.name},
                
                This is a friendly reminder that payment for Invoice ${invoice.invoice_number} is ${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'due soon'}.
                
                Invoice Number: ${invoice.invoice_number}
                Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
                Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
                Amount Due: $${parseFloat(invoice.amount_due || invoice.total_amount || 0).toFixed(2)}
                
                Please arrange payment at your earliest convenience. If you have already made this payment, please disregard this reminder.
                
                Thank you for your attention to this matter.
                
                Best regards,
                ${company.name}
                
                If you have any questions, please contact us at ${company.email}
            `
        };
    }
};

// Email service functions
const emailService = {
    // Send invoice email
    async sendInvoice(data) {
        try {
            const { to, invoice, company, customer, items, invoiceUrl } = data;
            const template = templates.invoice({ invoice, company, customer, items, invoiceUrl });
            
            const mailOptions = {
                from: `"${company.name}" <${process.env.SMTP_USER || 'info@invoice.dynaverseinvestment.com'}>`,
                to: to || customer.email || customer.customer_email,
                replyTo: company.email,
                subject: template.subject,
                text: template.text,
                html: template.html
            };
            
            const result = await transporter.sendMail(mailOptions);
            console.log('Invoice email sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Error sending invoice email:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Send quote email
    async sendQuote(data) {
        try {
            const { to, quote, company, customer, items, quoteUrl } = data;
            const template = templates.quote({ quote, company, customer, items, quoteUrl });
            
            const mailOptions = {
                from: `"${company.name}" <${process.env.SMTP_USER || 'info@invoice.dynaverseinvestment.com'}>`,
                to: to || customer.email || customer.customer_email,
                replyTo: company.email,
                subject: template.subject,
                text: template.text,
                html: template.html
            };
            
            const result = await transporter.sendMail(mailOptions);
            console.log('Quote email sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Error sending quote email:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Send payment receipt
    async sendPaymentReceipt(data) {
        try {
            const { to, payment, invoice, company, customer } = data;
            const template = templates.paymentReceipt({ payment, invoice, company, customer });
            
            const mailOptions = {
                from: `"${company.name}" <${process.env.SMTP_USER || 'info@invoice.dynaverseinvestment.com'}>`,
                to: to || customer.email || customer.customer_email,
                replyTo: company.email,
                subject: template.subject,
                text: template.text,
                html: template.html
            };
            
            const result = await transporter.sendMail(mailOptions);
            console.log('Payment receipt email sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Error sending payment receipt email:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Send payment reminder
    async sendPaymentReminder(data) {
        try {
            const { to, invoice, company, customer, daysOverdue } = data;
            const template = templates.paymentReminder({ invoice, company, customer, daysOverdue });
            
            const mailOptions = {
                from: `"${company.name}" <${process.env.SMTP_USER || 'info@invoice.dynaverseinvestment.com'}>`,
                to: to || customer.email || customer.customer_email,
                replyTo: company.email,
                subject: template.subject,
                text: template.text,
                html: template.html
            };
            
            const result = await transporter.sendMail(mailOptions);
            console.log('Payment reminder email sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Error sending payment reminder email:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Generic email sender
    async sendEmail(options) {
        try {
            const mailOptions = {
                from: options.from || `"${options.companyName || 'Financial System'}" <${process.env.SMTP_USER || 'info@invoice.dynaverseinvestment.com'}>`,
                to: options.to,
                replyTo: options.replyTo,
                subject: options.subject,
                text: options.text,
                html: options.html
            };
            
            const result = await transporter.sendMail(mailOptions);
            console.log('Email sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Error sending email:', error);
            return { success: false, error: error.message };
        }
    }
};

module.exports = emailService;

