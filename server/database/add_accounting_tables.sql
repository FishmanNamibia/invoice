-- Migration to add Chart of Accounts and General Ledger tables
-- Phase 1: Core Accounting Foundation

-- Chart of Accounts table
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
    account_category VARCHAR(100), -- Cash, Accounts Receivable, Accounts Payable, etc.
    parent_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL, -- For sub-accounts
    description TEXT,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_system_account BOOLEAN DEFAULT false, -- System accounts cannot be deleted
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, account_code)
);

-- General Ledger Entries (Journal Entries) table
CREATE TABLE IF NOT EXISTS general_ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    entry_number VARCHAR(100) NOT NULL,
    entry_date DATE NOT NULL,
    entry_type VARCHAR(50) NOT NULL, -- journal_entry, invoice, payment, expense, adjustment, etc.
    reference_type VARCHAR(50), -- invoice, payment, expense, bill, etc.
    reference_id UUID, -- ID of the source transaction
    description TEXT NOT NULL,
    notes TEXT,
    is_adjusted BOOLEAN DEFAULT false,
    adjusted_by UUID REFERENCES users(id),
    adjusted_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, entry_number)
);

-- General Ledger Transaction Lines (Debit/Credit entries)
CREATE TABLE IF NOT EXISTS gl_transaction_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID REFERENCES general_ledger_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company ON chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_gl_entries_company ON general_ledger_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_gl_entries_date ON general_ledger_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_gl_entries_type ON general_ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_gl_transaction_lines_entry ON gl_transaction_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_gl_transaction_lines_account ON gl_transaction_lines(account_id);

-- Add trigger for updated_at on chart_of_accounts
CREATE TRIGGER update_chart_of_accounts_updated_at 
    BEFORE UPDATE ON chart_of_accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for updated_at on general_ledger_entries
CREATE TRIGGER update_gl_entries_updated_at 
    BEFORE UPDATE ON general_ledger_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update account balance after GL transaction (INSERT/UPDATE)
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    account_type_var VARCHAR(50);
    balance_change DECIMAL(15,2);
    old_balance_change DECIMAL(15,2);
BEGIN
    -- Get account type
    SELECT account_type INTO account_type_var
    FROM chart_of_accounts
    WHERE id = COALESCE(NEW.account_id, OLD.account_id);
    
    -- Calculate balance change based on account type
    -- Assets and Expenses: Debit increases, Credit decreases
    -- Liabilities, Equity, and Revenue: Credit increases, Debit decreases
    
    IF TG_OP = 'UPDATE' THEN
        -- For UPDATE: subtract old values, add new values
        IF account_type_var IN ('Asset', 'Expense') THEN
            old_balance_change := OLD.debit_amount - OLD.credit_amount;
            balance_change := NEW.debit_amount - NEW.credit_amount - old_balance_change;
        ELSE
            old_balance_change := OLD.credit_amount - OLD.debit_amount;
            balance_change := NEW.credit_amount - NEW.debit_amount - old_balance_change;
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        -- For INSERT: add new values
        IF account_type_var IN ('Asset', 'Expense') THEN
            balance_change := NEW.debit_amount - NEW.credit_amount;
        ELSE
            balance_change := NEW.credit_amount - NEW.debit_amount;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- For DELETE: subtract old values
        IF account_type_var IN ('Asset', 'Expense') THEN
            balance_change := -(OLD.debit_amount - OLD.credit_amount);
        ELSE
            balance_change := -(OLD.credit_amount - OLD.debit_amount);
        END IF;
    END IF;
    
    -- Update account balance
    UPDATE chart_of_accounts
    SET current_balance = current_balance + balance_change
    WHERE id = COALESCE(NEW.account_id, OLD.account_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create trigger to update account balance on transaction
CREATE TRIGGER update_account_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON gl_transaction_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

