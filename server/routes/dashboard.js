const express = require('express');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// Get dashboard overview
router.get('/overview', async (req, res) => {
    try {
        const { companyId } = req.user;
        
        // Invoice statistics
        const invoiceStats = await db.query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'draft') as draft_invoices,
                COUNT(*) FILTER (WHERE status = 'sent') as sent_invoices,
                COUNT(*) FILTER (WHERE status = 'paid') as paid_invoices,
                COUNT(*) FILTER (WHERE status = 'overdue') as overdue_invoices,
                SUM(total_amount) FILTER (WHERE status != 'cancelled') as total_invoiced,
                SUM(amount_paid) as total_received,
                SUM(amount_due) FILTER (WHERE status NOT IN ('paid', 'cancelled')) as total_outstanding
             FROM invoices
             WHERE company_id = $1`,
            [companyId]
        );

        // Recent invoices
        const recentInvoices = await db.query(
            `SELECT i.id, i.invoice_number, i.invoice_date, i.total_amount, 
                    i.amount_due, i.status, c.customer_name
             FROM invoices i
             JOIN customers c ON i.customer_id = c.id
             WHERE i.company_id = $1
             ORDER BY i.created_at DESC
             LIMIT 5`,
            [companyId]
        );

        // Outstanding invoices
        const outstandingInvoices = await db.query(
            `SELECT i.id, i.invoice_number, i.invoice_date, i.due_date,
                    i.total_amount, i.amount_due, i.status, c.customer_name
             FROM invoices i
             JOIN customers c ON i.customer_id = c.id
             WHERE i.company_id = $1 AND i.status NOT IN ('paid', 'cancelled')
             ORDER BY i.due_date ASC
             LIMIT 10`,
            [companyId]
        );

        // Monthly income
        const monthlyIncome = await db.query(
            `SELECT 
                TO_CHAR(payment_date, 'YYYY-MM') as month,
                SUM(amount) as income
             FROM payments
             WHERE company_id = $1 
                AND payment_date >= CURRENT_DATE - INTERVAL '12 months'
             GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
             ORDER BY month DESC`,
            [companyId]
        );

        // Customer count
        const customerCount = await db.query(
            'SELECT COUNT(*) as total FROM customers WHERE company_id = $1 AND is_active = true',
            [companyId]
        );

        // Quote statistics
        const quoteStats = await db.query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'draft') as draft_quotes,
                COUNT(*) FILTER (WHERE status = 'sent') as sent_quotes,
                COUNT(*) FILTER (WHERE status = 'accepted') as accepted_quotes,
                SUM(total_amount) FILTER (WHERE status = 'accepted') as accepted_value
             FROM quotes
             WHERE company_id = $1`,
            [companyId]
        );

        res.json({
            invoiceStats: invoiceStats.rows[0],
            recentInvoices: recentInvoices.rows,
            outstandingInvoices: outstandingInvoices.rows,
            monthlyIncome: monthlyIncome.rows,
            customerCount: customerCount.rows[0].total,
            quoteStats: quoteStats.rows[0]
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get financial reports - Income Statement
router.get('/reports/income-statement', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }
        
        // Income
        const income = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total_income
             FROM payments
             WHERE company_id = $1
                AND payment_date >= $2
                AND payment_date <= $3`,
            [companyId, startDate, endDate]
        );

        // Expenses
        const expenses = await db.query(
            `SELECT 
                category,
                COALESCE(SUM(amount), 0) as total
             FROM expenses
             WHERE company_id = $1
                AND expense_date >= $2
                AND expense_date <= $3
             GROUP BY category
             ORDER BY total DESC`,
            [companyId, startDate, endDate]
        );

        const totalExpenses = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total_expenses
             FROM expenses
             WHERE company_id = $1
                AND expense_date >= $2
                AND expense_date <= $3`,
            [companyId, startDate, endDate]
        );

        const totalIncome = parseFloat(income.rows[0]?.total_income || 0);
        const totalExp = parseFloat(totalExpenses.rows[0]?.total_expenses || 0);
        const netIncome = totalIncome - totalExp;

        res.json({
            totalIncome,
            totalExpenses: totalExp,
            netIncome,
            expensesByCategory: expenses.rows
        });

    } catch (error) {
        console.error('Error fetching income statement:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Balance Sheet (Statement of Financial Position)
router.get('/reports/balance-sheet', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { asOfDate } = req.query;
        
        if (!asOfDate) {
            return res.status(400).json({ error: 'As of date is required for balance sheet' });
        }
        
        // Assets: Cash from payments, Accounts Receivable (outstanding invoices), Fixed Assets
        const cash = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE company_id = $1 AND payment_date <= $2`,
            [companyId, asOfDate]
        );
        
        const accountsReceivable = await db.query(
            `SELECT COALESCE(SUM(amount_due), 0) as total 
             FROM invoices 
             WHERE company_id = $1 
               AND status NOT IN ('paid', 'cancelled') 
               AND invoice_date <= $2`,
            [companyId, asOfDate]
        );
        
        // Assets
        const assets = [
            { account: 'Cash and Cash Equivalents', amount: parseFloat(cash.rows[0].total || 0) },
            { account: 'Accounts Receivable', amount: parseFloat(accountsReceivable.rows[0].total || 0) },
            { account: 'Fixed Assets', amount: 0 }, // Placeholder - would need fixed_assets table
            { account: 'Inventory', amount: 0 } // Placeholder
        ];
        const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
        
        // Liabilities: Accounts Payable (would need bills/expenses table)
        const accountsPayable = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total 
             FROM expenses 
             WHERE company_id = $1 
               AND expense_date <= $2`,
            [companyId, asOfDate]
        );
        
        const liabilities = [
            { account: 'Accounts Payable', amount: parseFloat(accountsPayable.rows[0].total || 0) },
            { account: 'Tax Payable', amount: 0 }, // Placeholder
            { account: 'Other Liabilities', amount: 0 } // Placeholder
        ];
        const totalLiabilities = liabilities.reduce((sum, item) => sum + item.amount, 0);
        
        // Equity: Retained Earnings (net income over time)
        const totalIncome = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total 
             FROM payments 
             WHERE company_id = $1 AND payment_date <= $2`,
            [companyId, asOfDate]
        );
        
        const totalExpenses = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total 
             FROM expenses 
             WHERE company_id = $1 AND expense_date <= $2`,
            [companyId, asOfDate]
        );
        
        const retainedEarnings = parseFloat(totalIncome.rows[0]?.total || 0) - parseFloat(totalExpenses.rows[0]?.total || 0);
        
        const equity = [
            { account: 'Share Capital', amount: 0 }, // Placeholder
            { account: 'Retained Earnings', amount: retainedEarnings }
        ];
        const totalEquity = equity.reduce((sum, item) => sum + item.amount, 0);
        
        res.json({
            assets,
            totalAssets,
            liabilities,
            totalLiabilities,
            equity,
            totalEquity
        });
        
    } catch (error) {
        console.error('Error fetching balance sheet:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Cash Flow Statement
router.get('/reports/cash-flow', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }
        
        // Operating Activities
        const operatingIncome = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE company_id = $1 AND payment_date >= $2 AND payment_date <= $3`,
            [companyId, startDate, endDate]
        );
        const operatingExpenses = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE company_id = $1 AND expense_date >= $2 AND expense_date <= $3`,
            [companyId, startDate, endDate]
        );
        
        const operatingActivities = [
            { description: 'Cash received from customers', amount: parseFloat(operatingIncome.rows[0].total || 0) },
            { description: 'Cash paid to suppliers', amount: -parseFloat(operatingExpenses.rows[0].total || 0) }
        ];
        const netOperatingCash = operatingActivities.reduce((sum, item) => sum + item.amount, 0);
        
        // Investing Activities (placeholder)
        const investingActivities = [
            { description: 'Purchase of fixed assets', amount: 0 },
            { description: 'Sale of fixed assets', amount: 0 }
        ];
        const netInvestingCash = investingActivities.reduce((sum, item) => sum + item.amount, 0);
        
        // Financing Activities (placeholder)
        const financingActivities = [
            { description: 'Equity contributions', amount: 0 },
            { description: 'Loan proceeds', amount: 0 },
            { description: 'Loan repayments', amount: 0 }
        ];
        const netFinancingCash = financingActivities.reduce((sum, item) => sum + item.amount, 0);
        
        const netChangeInCash = netOperatingCash + netInvestingCash + netFinancingCash;
        
        res.json({
            operatingActivities,
            netOperatingCash,
            investingActivities,
            netInvestingCash,
            financingActivities,
            netFinancingCash,
            netChangeInCash
        });
        
    } catch (error) {
        console.error('Error fetching cash flow statement:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Accounts Receivable (Debtors) Summary
router.get('/reports/accounts-receivable', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { startDate, endDate } = req.query;
        
        // Allow optional date range - if not provided, show all
        const dateFilter = startDate && endDate 
            ? `AND i.invoice_date >= $2 AND i.invoice_date <= $3`
            : ``;
        const dateParams = startDate && endDate ? [companyId, startDate, endDate] : [companyId];
        
        const invoices = await db.query(
            `SELECT 
                i.invoice_number,
                i.invoice_date,
                i.due_date,
                i.amount_due,
                i.status,
                c.customer_name
             FROM invoices i
             JOIN customers c ON i.customer_id = c.id
             WHERE i.company_id = $1
               AND i.status NOT IN ('paid', 'cancelled')
               ${dateFilter}
             ORDER BY i.due_date ASC`,
            dateParams
        );
        
        const totalReceivable = await db.query(
            `SELECT COALESCE(SUM(amount_due), 0) as total
             FROM invoices
             WHERE company_id = $1
               AND status NOT IN ('paid', 'cancelled')`,
            [companyId]
        );
        
        res.json({
            invoices: invoices.rows,
            totalReceivable: parseFloat(totalReceivable.rows[0].total || 0)
        });
        
    } catch (error) {
        console.error('Error fetching accounts receivable:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Accounts Payable (Creditors) Summary
router.get('/reports/accounts-payable', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { startDate, endDate } = req.query;
        
        // Using expenses as a proxy for accounts payable
        // Allow optional date range - if not provided, show all
        const dateFilter = startDate && endDate 
            ? `AND expense_date >= $2 AND expense_date <= $3`
            : ``;
        const dateParams = startDate && endDate ? [companyId, startDate, endDate] : [companyId];
        
        const expenses = await db.query(
            `SELECT 
                id,
                expense_date as bill_date,
                expense_date as due_date,
                amount as amount_due,
                'pending' as status,
                description as bill_number,
                category as supplier_name
             FROM expenses
             WHERE company_id = $1
               ${dateFilter}
             ORDER BY expense_date ASC`,
            dateParams
        );
        
        const totalPayable = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total
             FROM expenses
             WHERE company_id = $1`,
            [companyId]
        );
        
        res.json({
            bills: expenses.rows,
            totalPayable: parseFloat(totalPayable.rows[0].total || 0)
        });
        
    } catch (error) {
        console.error('Error fetching accounts payable:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Trial Balance
router.get('/reports/trial-balance', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { startDate, endDate } = req.query;
        
        // Allow optional date range - if not provided, show all
        const dateFilter = startDate && endDate 
            ? `AND payment_date >= $2 AND payment_date <= $3`
            : ``;
        const dateParams = startDate && endDate ? [companyId, startDate, endDate] : [companyId];
        
        // Get income accounts (payments)
        const incomeAccounts = await db.query(
            `SELECT 
                '4000' as code,
                'Revenue' as name,
                COALESCE(SUM(amount), 0) as credit,
                0 as debit
             FROM payments
             WHERE company_id = $1
               ${dateFilter}`,
            dateParams
        );
        
        // Get expense accounts
        const expenseDateFilter = startDate && endDate 
            ? `AND expense_date >= $2 AND expense_date <= $3`
            : ``;
        const expenseAccounts = await db.query(
            `SELECT 
                '5000' as code,
                category as name,
                0 as credit,
                COALESCE(SUM(amount), 0) as debit
             FROM expenses
             WHERE company_id = $1
               ${expenseDateFilter}
             GROUP BY category`,
            dateParams // Uses same params as income accounts (both have same date range or none)
        );
        
        // Get accounts receivable (no date filter - shows all outstanding)
        const arAccounts = await db.query(
            `SELECT 
                '1000' as code,
                'Accounts Receivable' as name,
                0 as credit,
                COALESCE(SUM(amount_due), 0) as debit
             FROM invoices
             WHERE company_id = $1
               AND status NOT IN ('paid', 'cancelled')`,
            [companyId]
        );
        
        // Get accounts payable (no date filter - shows all)
        const apAccounts = await db.query(
            `SELECT 
                '2000' as code,
                'Accounts Payable' as name,
                COALESCE(SUM(amount), 0) as credit,
                0 as debit
             FROM expenses
             WHERE company_id = $1`,
            [companyId]
        );
        
        const accounts = [];
        
        // Add income account if it has credit balance
        if (incomeAccounts.rows.length > 0 && parseFloat(incomeAccounts.rows[0].credit || 0) > 0) {
            accounts.push(incomeAccounts.rows[0]);
        }
        
        // Add expense accounts
        accounts.push(...expenseAccounts.rows);
        
        // Add AR account if it has debit balance
        if (arAccounts.rows.length > 0 && parseFloat(arAccounts.rows[0].debit || 0) > 0) {
            accounts.push(arAccounts.rows[0]);
        }
        
        // Add AP account if it has credit balance
        if (apAccounts.rows.length > 0 && parseFloat(apAccounts.rows[0].credit || 0) > 0) {
            accounts.push(apAccounts.rows[0]);
        }
        
        const totalDebit = accounts.reduce((sum, acc) => sum + parseFloat(acc.debit || 0), 0);
        const totalCredit = accounts.reduce((sum, acc) => sum + parseFloat(acc.credit || 0), 0);
        
        res.json({
            accounts,
            totalDebit,
            totalCredit
        });
        
    } catch (error) {
        console.error('Error fetching trial balance:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Placeholder routes for other reports (to be implemented as needed)
router.get('/reports/changes-equity', async (req, res) => {
    res.json({ message: 'Statement of Changes in Equity - Coming soon' });
});

// Send financial report via email
router.post('/reports/send-email', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { reportType, reportName, emails, dateRange, params } = req.body;
        
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ error: 'At least one email address is required' });
        }

        // Get company details
        const companyResult = await db.query(
            'SELECT * FROM companies WHERE id = $1',
            [companyId]
        );

        if (companyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const company = companyResult.rows[0];

        // Generate the report data
        const reportParams = reportType === 'balance-sheet' 
            ? { asOfDate: params?.asOfDate || dateRange?.asOfDate }
            : { startDate: params?.startDate || dateRange?.startDate, endDate: params?.endDate || dateRange?.endDate };

        let reportData = null;
        
        // Fetch report data based on type
        if (reportType === 'income-statement') {
            const result = await db.query(
                `SELECT COALESCE(SUM(p.amount), 0) as total_income,
                        COALESCE(SUM(e.amount), 0) as total_expenses
                 FROM payments p
                 LEFT JOIN expenses e ON e.company_id = p.company_id 
                     AND e.expense_date >= $2 AND e.expense_date <= $3
                 WHERE p.company_id = $1
                    AND p.payment_date >= $2 AND p.payment_date <= $3`,
                [companyId, reportParams.startDate, reportParams.endDate]
            );
            reportData = result.rows[0];
        } else if (reportType === 'balance-sheet') {
            const cash = await db.query(
                `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE company_id = $1 AND payment_date <= $2`,
                [companyId, reportParams.asOfDate]
            );
            const ar = await db.query(
                `SELECT COALESCE(SUM(amount_due), 0) as total FROM invoices 
                 WHERE company_id = $1 AND status NOT IN ('paid', 'cancelled') AND invoice_date <= $2`,
                [companyId, reportParams.asOfDate]
            );
            reportData = {
                cash: parseFloat(cash.rows[0].total || 0),
                accountsReceivable: parseFloat(ar.rows[0].total || 0)
            };
        }

        // Send email using email service
        const emailService = require('../services/emailService');
        
        // Format report data for email
        const dateLabel = reportType === 'balance-sheet' 
            ? `As of ${new Date(dateRange?.asOfDate || params?.asOfDate).toLocaleDateString()}`
            : `From ${new Date(dateRange?.startDate || params?.startDate).toLocaleDateString()} to ${new Date(dateRange?.endDate || params?.endDate).toLocaleDateString()}`;

        const reportSummary = reportType === 'income-statement'
            ? `Total Income: $${parseFloat(reportData.total_income || 0).toFixed(2)}\nTotal Expenses: $${parseFloat(reportData.total_expenses || 0).toFixed(2)}\nNet Income: $${(parseFloat(reportData.total_income || 0) - parseFloat(reportData.total_expenses || 0)).toFixed(2)}`
            : reportType === 'balance-sheet'
            ? `Cash: $${parseFloat(reportData.cash || 0).toFixed(2)}\nAccounts Receivable: $${parseFloat(reportData.accountsReceivable || 0).toFixed(2)}`
            : 'Report data included';

        const emailResult = await emailService.sendEmail({
            to: emails.join(','),
            subject: `${reportName} - ${company.name}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9fafb; }
                        .report-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 8px; }
                        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>${reportName}</h1>
                            <p>${company.name}</p>
                        </div>
                        <div class="content">
                            <p>Please find attached your financial report.</p>
                            
                            <div class="report-details">
                                <p><strong>Report Type:</strong> ${reportName}</p>
                                <p><strong>Period:</strong> ${dateLabel}</p>
                                <p><strong>Company:</strong> ${company.name}</p>
                                <pre style="white-space: pre-wrap; font-family: Arial; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">${reportSummary}</pre>
                            </div>
                            
                            <p>This report has been generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}.</p>
                            <p>Please review the detailed report in your account or contact us if you have any questions.</p>
                            
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
${reportName} - ${company.name}

Please find your financial report:

Report Type: ${reportName}
Period: ${dateLabel}
Company: ${company.name}

${reportSummary}

This report has been generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}.

Please review the detailed report in your account or contact us if you have any questions.

Best regards,
${company.name}

If you have any questions, please contact us at ${company.email}
            `,
            companyName: company.name,
            replyTo: company.email
        });

        if (emailResult.success) {
            res.json({ 
                message: 'Financial report sent via email successfully',
                messageId: emailResult.messageId 
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to send email',
                details: emailResult.error 
            });
        }
    } catch (error) {
        console.error('Error sending report email:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/reports/general-ledger', async (req, res) => {
    res.json({ message: 'General Ledger - Coming soon' });
});

// Fixed Asset Register
router.get('/reports/fixed-asset', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { asOfDate } = req.query;
        
        // Get all fixed assets
        const assets = await db.query(
            `SELECT * FROM fixed_assets 
             WHERE company_id = $1 
               AND status = 'active'
             ORDER BY asset_name`,
            [companyId]
        );

        // Calculate totals
        const totals = await db.query(
            `SELECT 
                COALESCE(SUM(purchase_cost), 0) as total_cost,
                COALESCE(SUM(accumulated_depreciation), 0) as total_depreciation,
                COALESCE(SUM(net_book_value), 0) as total_net_book_value
             FROM fixed_assets
             WHERE company_id = $1 AND status = 'active'`,
            [companyId]
        );

        res.json({
            assets: assets.rows,
            totals: totals.rows[0],
            asOfDate: asOfDate || new Date().toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('Error fetching fixed assets:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Budget vs Actual Report
router.get('/reports/budget-actual', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { startDate, endDate, budgetYear } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const year = budgetYear || new Date(startDate).getFullYear();

        // Get budgeted amounts by category
        const budgets = await db.query(
            `SELECT category, SUM(budgeted_amount) as budgeted_amount
             FROM budgets
             WHERE company_id = $1 
               AND budget_year = $2
               AND period_start <= $4
               AND period_end >= $3
             GROUP BY category
             ORDER BY category`,
            [companyId, year, startDate, endDate]
        );

        // Get actual income (payments)
        const actualIncome = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as actual_amount
             FROM payments
             WHERE company_id = $1
               AND payment_date >= $2
               AND payment_date <= $3`,
            [companyId, startDate, endDate]
        );

        // Get actual expenses by category
        const actualExpenses = await db.query(
            `SELECT category, COALESCE(SUM(amount), 0) as actual_amount
             FROM expenses
             WHERE company_id = $1
               AND expense_date >= $2
               AND expense_date <= $3
             GROUP BY category
             ORDER BY category`,
            [companyId, startDate, endDate]
        );

        // Combine budgets and actuals
        const comparison = [];
        budgets.rows.forEach(budget => {
            const actual = actualExpenses.rows.find(exp => exp.category === budget.category);
            comparison.push({
                category: budget.category,
                budgeted: parseFloat(budget.budgeted_amount || 0),
                actual: parseFloat(actual?.actual_amount || 0),
                variance: parseFloat(budget.budgeted_amount || 0) - parseFloat(actual?.actual_amount || 0),
                variancePercent: parseFloat(budget.budgeted_amount || 0) > 0 
                    ? ((parseFloat(budget.budgeted_amount || 0) - parseFloat(actual?.actual_amount || 0)) / parseFloat(budget.budgeted_amount || 0)) * 100
                    : 0
            });
        });

        // Add revenue comparison
        const revenueBudget = budgets.rows.find(b => b.category === 'revenue');
        if (revenueBudget || actualIncome.rows[0]?.actual_amount > 0) {
            comparison.unshift({
                category: 'Revenue',
                budgeted: parseFloat(revenueBudget?.budgeted_amount || 0),
                actual: parseFloat(actualIncome.rows[0]?.actual_amount || 0),
                variance: parseFloat(revenueBudget?.budgeted_amount || 0) - parseFloat(actualIncome.rows[0]?.actual_amount || 0),
                variancePercent: parseFloat(revenueBudget?.budgeted_amount || 0) > 0
                    ? ((parseFloat(revenueBudget?.budgeted_amount || 0) - parseFloat(actualIncome.rows[0]?.actual_amount || 0)) / parseFloat(revenueBudget?.budgeted_amount || 0)) * 100
                    : 0
            });
        }

        res.json({
            comparison,
            period: { startDate, endDate, budgetYear: year }
        });
    } catch (error) {
        console.error('Error fetching budget vs actual:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Department Performance Report
router.get('/reports/department-performance', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        // Get all departments
        const departments = await db.query(
            `SELECT * FROM departments 
             WHERE company_id = $1 AND is_active = true
             ORDER BY department_name`,
            [companyId]
        );

        // If no departments exist, create a default "General" department
        let departmentList = departments.rows;
        if (departmentList.length === 0) {
            departmentList = [{ id: null, department_name: 'General', department_code: null }];
        }

        // Get performance by department
        const performance = await Promise.all(departmentList.map(async (dept) => {
            const deptId = dept.id;
            // Income for this department
            const incomeParams = deptId ? [companyId, startDate, endDate, deptId] : [companyId, startDate, endDate];
            const incomeFilter = deptId ? 'AND department_id = $4' : 'AND (department_id IS NULL)';
            const income = await db.query(
                `SELECT COALESCE(SUM(amount), 0) as total_income
                 FROM payments
                 WHERE company_id = $1
                   AND payment_date >= $2
                   AND payment_date <= $3
                   ${incomeFilter}`,
                incomeParams
            );

            // Expenses for this department
            const expenseParams = deptId ? [companyId, startDate, endDate, deptId] : [companyId, startDate, endDate];
            const expenseFilter = deptId ? 'AND department_id = $4' : 'AND (department_id IS NULL)';
            const expenses = await db.query(
                `SELECT 
                    category,
                    COALESCE(SUM(amount), 0) as total_expense
                 FROM expenses
                 WHERE company_id = $1
                   AND expense_date >= $2
                   AND expense_date <= $3
                   ${expenseFilter}
                 GROUP BY category
                 ORDER BY total_expense DESC`,
                expenseParams
            );

            const totalIncome = parseFloat(income.rows[0]?.total_income || 0);
            const totalExpenses = expenses.rows.reduce((sum, exp) => sum + parseFloat(exp.total_expense || 0), 0);
            const netIncome = totalIncome - totalExpenses;

            return {
                departmentId: dept.id,
                departmentName: dept.department_name || 'General',
                departmentCode: dept.department_code,
                totalIncome,
                totalExpenses,
                netIncome,
                expensesByCategory: expenses.rows.map(exp => ({
                    category: exp.category,
                    amount: parseFloat(exp.total_expense || 0)
                }))
            };
        }));

        res.json({
            performance,
            period: { startDate, endDate }
        });
    } catch (error) {
        console.error('Error fetching department performance:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Notes to Financial Statements
router.get('/reports/notes-financials', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { startDate, endDate, asOfDate } = req.query;
        
        // Get company information
        const companyInfo = await db.query(
            'SELECT * FROM companies WHERE id = $1',
            [companyId]
        );

        const company = companyInfo.rows[0];

        // Calculate key financial metrics for notes
        const endDateForCalculation = asOfDate || endDate || new Date().toISOString().split('T')[0];
        const startDateForCalculation = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

        // Revenue metrics
        const revenueMetrics = await db.query(
            `SELECT 
                COALESCE(COUNT(*), 0) as invoice_count,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(amount_paid), 0) as total_received
             FROM invoices
             WHERE company_id = $1
               AND invoice_date >= $2
               AND invoice_date <= $3
               AND status != 'cancelled'`,
            [companyId, startDateForCalculation, endDateForCalculation]
        );

        // Expense metrics
        const expenseMetrics = await db.query(
            `SELECT 
                COALESCE(COUNT(DISTINCT category), 0) as category_count,
                COALESCE(SUM(amount), 0) as total_expenses
             FROM expenses
             WHERE company_id = $1
               AND expense_date >= $2
               AND expense_date <= $3`,
            [companyId, startDateForCalculation, endDateForCalculation]
        );

        // Asset metrics
        const assetMetrics = await db.query(
            `SELECT 
                COALESCE(COUNT(*), 0) as asset_count,
                COALESCE(SUM(purchase_cost), 0) as total_cost,
                COALESCE(SUM(net_book_value), 0) as total_net_book_value
             FROM fixed_assets
             WHERE company_id = $1 AND status = 'active'`,
            [companyId]
        );

        // Outstanding receivables
        const receivables = await db.query(
            `SELECT COALESCE(SUM(amount_due), 0) as total_receivable
             FROM invoices
             WHERE company_id = $1
               AND status NOT IN ('paid', 'cancelled')`,
            [companyId]
        );

        // Outstanding payables
        const payables = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total_payable
             FROM expenses
             WHERE company_id = $1`,
            [companyId]
        );

        const notes = {
            companyInformation: {
                name: company.name,
                email: company.email,
                address: company.address,
                city: company.city,
                state: company.state,
                country: company.country,
                taxNumber: company.tax_number
            },
            accountingPolicies: {
                reportingPeriod: {
                    startDate: startDateForCalculation,
                    endDate: endDateForCalculation,
                    asOfDate: endDateForCalculation
                },
                currency: company.currency || 'USD',
                revenueRecognition: 'Revenue is recognized when services are delivered and invoices are issued.',
                expenseRecognition: 'Expenses are recognized on an accrual basis when incurred.',
                depreciationMethod: 'Straight-line method applied to fixed assets.'
            },
            revenue: {
                totalRevenue: parseFloat(revenueMetrics.rows[0]?.total_revenue || 0),
                invoicesIssued: parseInt(revenueMetrics.rows[0]?.invoice_count || 0),
                totalReceived: parseFloat(revenueMetrics.rows[0]?.total_received || 0)
            },
            expenses: {
                totalExpenses: parseFloat(expenseMetrics.rows[0]?.total_expenses || 0),
                expenseCategories: parseInt(expenseMetrics.rows[0]?.category_count || 0)
            },
            assets: {
                assetCount: parseInt(assetMetrics.rows[0]?.asset_count || 0),
                totalCost: parseFloat(assetMetrics.rows[0]?.total_cost || 0),
                netBookValue: parseFloat(assetMetrics.rows[0]?.total_net_book_value || 0)
            },
            receivables: {
                totalReceivable: parseFloat(receivables.rows[0]?.total_receivable || 0)
            },
            payables: {
                totalPayable: parseFloat(payables.rows[0]?.total_payable || 0)
            }
        };

        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes to financial statements:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

module.exports = router;

