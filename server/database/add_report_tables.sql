-- Migration to add tables for new financial reports
-- Fixed Assets, Budgets, Departments

-- Fixed Assets table
CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    asset_code VARCHAR(100),
    asset_name VARCHAR(255) NOT NULL,
    asset_category VARCHAR(100),
    purchase_date DATE,
    purchase_cost DECIMAL(15,2) NOT NULL,
    depreciation_method VARCHAR(50) DEFAULT 'straight-line', -- straight-line, declining-balance
    useful_life_years INTEGER DEFAULT 5,
    depreciation_rate DECIMAL(5,2), -- Annual depreciation percentage
    accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
    net_book_value DECIMAL(15,2) NOT NULL,
    location VARCHAR(255),
    serial_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- active, disposed, sold
    disposal_date DATE,
    disposal_amount DECIMAL(15,2),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    budget_name VARCHAR(255) NOT NULL,
    budget_year INTEGER NOT NULL,
    budget_period VARCHAR(50) NOT NULL, -- monthly, quarterly, annual
    category VARCHAR(100) NOT NULL, -- revenue, expense, or specific category
    budgeted_amount DECIMAL(15,2) NOT NULL,
    period_start DATE,
    period_end DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, budget_name, budget_year, budget_period, category, period_start)
);

-- Departments/Segments (can be used for segmentation)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    department_code VARCHAR(100),
    department_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, department_name)
);

-- Add department_id to invoices and payments if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='department_id') THEN
        ALTER TABLE invoices ADD COLUMN department_id UUID REFERENCES departments(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='department_id') THEN
        ALTER TABLE payments ADD COLUMN department_id UUID REFERENCES departments(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='department_id') THEN
        ALTER TABLE expenses ADD COLUMN department_id UUID REFERENCES departments(id);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fixed_assets_company ON fixed_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_budgets_company ON budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_department ON invoices(department_id);
CREATE INDEX IF NOT EXISTS idx_payments_department ON payments(department_id);
CREATE INDEX IF NOT EXISTS idx_expenses_department ON expenses(department_id);

