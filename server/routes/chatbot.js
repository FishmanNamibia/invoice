const express = require('express');
const router = express.Router();

// Comprehensive Knowledge Base
const knowledgeBase = [
    // INVOICES
    {
        patterns: ['create invoice', 'new invoice', 'make invoice', 'add invoice', 'how to invoice'],
        response: `To create an invoice:\n\n1. Click on "Invoices" in the sidebar\n2. Click the "+ New Invoice" button\n3. Select a customer (or create a new one)\n4. Add items/services with quantities and prices\n5. Review the total amount\n6. Click "Save" or "Save & Send"\n\nYou can also generate a PDF version to send to your customer!`
    },
    {
        patterns: ['edit invoice', 'modify invoice', 'change invoice', 'update invoice'],
        response: `To edit an invoice:\n\n1. Go to "Invoices" from the sidebar\n2. Find the invoice you want to edit\n3. Click on the invoice to view it\n4. Click the "Edit" button\n5. Make your changes\n6. Click "Save" to update\n\nNote: You can only edit invoices that haven't been fully paid.`
    },
    {
        patterns: ['view invoice', 'see invoice', 'check invoice', 'invoice details'],
        response: `To view an invoice:\n\n1. Click "Invoices" in the sidebar\n2. You'll see a list of all invoices\n3. Click on any invoice to see full details\n4. From there you can:\n   - Download as PDF\n   - Send via email\n   - Edit if needed\n   - Record payments`
    },
    {
        patterns: ['delete invoice', 'remove invoice'],
        response: `To delete an invoice:\n\n1. Go to "Invoices"\n2. Find the invoice to delete\n3. Click on it to view details\n4. Click the "Delete" button\n5. Confirm the deletion\n\nNote: It's better to mark invoices as "void" or "cancelled" rather than deleting them for record-keeping purposes.`
    },
    {
        patterns: ['invoice pdf', 'download invoice', 'invoice print', 'generate pdf'],
        response: `To generate an invoice PDF:\n\n1. Go to "Invoices" and open the invoice\n2. Click the "Download PDF" button\n3. The PDF will be generated with your company logo and bank details\n4. You can then:\n   - Save it to your computer\n   - Print it\n   - Email it to your customer\n\nThe PDF includes all invoice details, company information, and payment instructions.`
    },

    // CUSTOMERS
    {
        patterns: ['add customer', 'new customer', 'create customer', 'customer add'],
        response: `To add a new customer:\n\n1. Click "Customers" in the sidebar\n2. Click the "+ New Customer" button\n3. Fill in the customer details:\n   - Name (required)\n   - Email\n   - Phone\n   - Address\n   - Any other relevant information\n4. Click "Save"\n\nYou can then use this customer when creating invoices and quotes!`
    },
    {
        patterns: ['edit customer', 'update customer', 'change customer', 'modify customer'],
        response: `To edit customer information:\n\n1. Go to "Customers"\n2. Find the customer in the list\n3. Click on the customer or click "Edit"\n4. Update the information\n5. Click "Save"\n\nAll future invoices will use the updated information.`
    },
    {
        patterns: ['delete customer', 'remove customer'],
        response: `To delete a customer:\n\n1. Go to "Customers"\n2. Find the customer\n3. Click "Delete" or the delete icon\n4. Confirm the deletion\n\nNote: You cannot delete customers who have existing invoices or quotes. Archive them instead if needed.`
    },

    // PAYMENTS
    {
        patterns: ['record payment', 'add payment', 'receive payment', 'payment received'],
        response: `To record a payment:\n\n1. Go to "Payments" in the sidebar\n2. Click "+ New Payment" button\n3. Select the invoice being paid\n4. Enter the payment amount\n5. Select payment method (cash, bank transfer, etc.)\n6. Add payment date\n7. Add any notes if needed\n8. Click "Save"\n\nThe invoice status will automatically update based on the payment!`
    },
    {
        patterns: ['view payment', 'check payment', 'payment history'],
        response: `To view payments:\n\n1. Click "Payments" in the sidebar\n2. You'll see all recorded payments\n3. Click on any payment to see details\n4. You can filter by:\n   - Customer\n   - Date range\n   - Payment method\n   - Invoice\n\nYou can also see payment history from the invoice details page.`
    },

    // QUOTES
    {
        patterns: ['create quote', 'new quote', 'make quote', 'send quote'],
        response: `To create a quote:\n\n1. Click "Quotes" in the sidebar\n2. Click "+ New Quote" button\n3. Select a customer\n4. Add items/services with prices\n5. Review the quote details\n6. Click "Save"\n\nYou can then send the quote to your customer and convert it to an invoice when they accept!`
    },
    {
        patterns: ['convert quote', 'quote to invoice', 'accept quote'],
        response: `To convert a quote to an invoice:\n\n1. Go to "Quotes"\n2. Open the quote you want to convert\n3. Click "Convert to Invoice" button\n4. Review the invoice details\n5. Make any necessary adjustments\n6. Click "Save"\n\nThe quote will be marked as accepted and a new invoice will be created!`
    },

    // ITEMS
    {
        patterns: ['add item', 'new item', 'create item', 'add product', 'add service'],
        response: `To add items/services:\n\n1. Click "Items" in the sidebar\n2. Click "+ New Item" button\n3. Enter item details:\n   - Name (required)\n   - Description\n   - Price\n   - Unit (e.g., hours, pieces)\n   - Category\n4. Click "Save"\n\nYou can then quickly add these items to invoices and quotes!`
    },

    // SETTINGS
    {
        patterns: ['company settings', 'update company', 'company info', 'business details'],
        response: `To update company settings:\n\n1. Click "Settings" in the sidebar\n2. Update your information:\n   - Company name\n   - Email\n   - Phone\n   - Address\n   - Currency\n   - Logo (upload an image)\n3. Scroll down for bank account details\n4. Click "Save Changes"\n\nThis information appears on all your invoices and quotes!`
    },
    {
        patterns: ['bank details', 'bank account', 'payment details', 'account details'],
        response: `To add bank account details:\n\n1. Go to "Settings"\n2. Scroll to "Bank Account Details" section\n3. Enter your banking information:\n   - Bank name\n   - Account holder name\n   - Account number\n   - Routing number (if applicable)\n   - SWIFT/BIC code (for international)\n   - IBAN (if applicable)\n4. Click "Save Changes"\n\nThese details will appear on your invoices so customers know where to send payments!`
    },
    {
        patterns: ['upload logo', 'company logo', 'add logo', 'change logo'],
        response: `To add/change your company logo:\n\n1. Go to "Settings"\n2. Find the "Company Logo" section\n3. Click "Choose File" or drag and drop an image\n4. Best formats: PNG, JPG\n5. Recommended size: 200x200 pixels or larger\n6. Click "Save Changes"\n\nYour logo will appear on all invoices, quotes, and documents!`
    },
    {
        patterns: ['change currency', 'set currency', 'currency settings'],
        response: `To change your currency:\n\n1. Go to "Settings"\n2. Find the "Currency" dropdown\n3. Select your preferred currency\n4. Click "Save Changes"\n\nNote: Changing currency affects all new invoices and quotes. Existing documents keep their original currency.`
    },

    // SECURITY
    {
        patterns: ['2fa', 'two factor', 'enable 2fa', 'two-factor authentication', 'security'],
        response: `To enable Two-Factor Authentication (2FA):\n\n1. Click "Account Security" in the sidebar\n2. Find "Two-Factor Authentication" section\n3. Click "Enable 2FA"\n4. You'll receive a code via email\n5. Enter the code to activate\n6. Save your backup codes in a safe place!\n\nWith 2FA enabled, you'll need to enter a code from your email each time you login.`
    },
    {
        patterns: ['change password', 'update password', 'reset password', 'new password'],
        response: `To change your password:\n\n1. Click "Account Security" in the sidebar\n2. Find "Change Password" section\n3. Enter your current password\n4. Enter your new password\n5. Confirm the new password\n6. Click "Update Password"\n\nFor security, use a strong password with letters, numbers, and symbols!`
    },
    {
        patterns: ['forgot password', 'lost password', 'password reset'],
        response: `If you forgot your password:\n\n1. Go to the login page\n2. Click "Forgot Password?" link\n3. Enter your email address\n4. Click "Send Reset Link"\n5. Check your email for the reset link\n6. Click the link and set a new password\n\nThe reset link expires in 1 hour for security.`
    },

    // REPORTS & ANALYTICS
    {
        patterns: ['reports', 'financial reports', 'view reports', 'generate report'],
        response: `To access reports:\n\n1. Click "Reports" in the sidebar\n2. Choose from available reports:\n   - Income statements\n   - Balance sheets\n   - Cash flow reports\n   - Invoice summaries\n   - Customer reports\n3. Select date range\n4. Click "Generate Report"\n5. You can export as PDF or Excel\n\nReports help you track your business performance!`
    },
    {
        patterns: ['dashboard', 'overview', 'main page', 'home'],
        response: `The Dashboard shows your financial overview:\n\n- Total revenue\n- Outstanding invoices\n- Recent payments\n- Quick statistics\n- Recent activity\n\nClick "Dashboard" in the sidebar to return to the main overview at any time!`
    },

    // GENERAL LEDGER & ACCOUNTING
    {
        patterns: ['general ledger', 'ledger', 'transactions', 'accounting'],
        response: `The General Ledger tracks all transactions:\n\n1. Click "General Ledger" in sidebar\n2. View all financial transactions\n3. Filter by:\n   - Date range\n   - Account type\n   - Transaction type\n4. See detailed transaction history\n\nThis gives you a complete view of your financial activities!`
    },
    {
        patterns: ['chart of accounts', 'account structure', 'accounts'],
        response: `The Chart of Accounts organizes your finances:\n\n1. Click "Chart of Accounts" in sidebar\n2. View all account categories:\n   - Assets\n   - Liabilities\n   - Equity\n   - Revenue\n   - Expenses\n3. Add new accounts as needed\n4. Organize your financial structure\n\nThis is the foundation of your accounting system!`
    },

    // TROUBLESHOOTING
    {
        patterns: ['not working', 'error', 'problem', 'issue', 'broken', 'help'],
        response: `I'm sorry you're experiencing an issue! Here's what to try:\n\n1. Refresh the page (Ctrl+R or Cmd+R)\n2. Clear your browser cache\n3. Try logging out and back in\n4. Check your internet connection\n5. Try a different browser\n\nIf the problem persists, please contact our support team at info@invoice.dynaverseinvestment.com with details about the issue.`
    },
    {
        patterns: ['slow', 'loading', 'performance'],
        response: `If the application is running slow:\n\n1. Check your internet connection\n2. Close other browser tabs\n3. Clear your browser cache\n4. Try using a different browser\n5. Restart your browser\n\nIf issues continue, contact support at info@invoice.dynaverseinvestment.com`
    },

    // GREETINGS
    {
        patterns: ['hello', 'hi', 'hey', 'greetings'],
        response: `Hello! 👋 I'm here to help you with the Financial Management System. I can help you with:\n\n• Creating invoices and quotes\n• Managing customers\n• Recording payments\n• Setting up your company info\n• Enabling security features\n• And much more!\n\nWhat would you like to know?`
    },
    {
        patterns: ['thank', 'thanks', 'thx'],
        response: `You're welcome! 😊 Is there anything else I can help you with?`
    },
    {
        patterns: ['bye', 'goodbye', 'see you'],
        response: `Goodbye! If you need any more help, just click the chat button again. Have a great day! 👋`
    }
];

// Pattern matching function
function findBestMatch(userMessage) {
    const messageLower = userMessage.toLowerCase();
    
    // Find all matching patterns
    const matches = knowledgeBase.filter(item => 
        item.patterns.some(pattern => messageLower.includes(pattern))
    );
    
    if (matches.length > 0) {
        // Return the first match (could be enhanced with scoring)
        return matches[0].response;
    }
    
    return null;
}

// Default response when no match found
function getDefaultResponse() {
    return `I'm not sure I understand that question. Here are some things I can help with:\n\n• Creating and managing invoices\n• Adding customers\n• Recording payments\n• Creating quotes\n• Company settings and bank details\n• Setting up 2FA and security\n• Viewing reports\n\nTry asking me "How do I create an invoice?" or "How do I add a customer?"\n\nFor specific issues, please contact our support team at info@invoice.dynaverseinvestment.com`;
}

// POST /api/chatbot/message
router.post('/message', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Find matching response
        let reply = findBestMatch(message);
        
        // If no match, use default response
        if (!reply) {
            reply = getDefaultResponse();
        }

        // Add a small delay to make it feel more natural (optional)
        await new Promise(resolve => setTimeout(resolve, 500));

        res.json({
            reply,
            supportEmail: 'info@invoice.dynaverseinvestment.com'
        });

    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ 
            error: 'An error occurred. Please try again or contact support at info@invoice.dynaverseinvestment.com',
            supportEmail: 'info@invoice.dynaverseinvestment.com'
        });
    }
});

// GET /api/chatbot/health
router.get('/health', (req, res) => {
    res.json({
        available: true,
        message: 'Custom chatbot service is available',
        type: 'rule-based'
    });
});

module.exports = router;

