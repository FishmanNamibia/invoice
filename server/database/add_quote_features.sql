-- Migration to add missing quote/invoice features from Brisk Invoicing
-- Add Salesperson and Quote Type fields

-- Add salesperson field to quotes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='salesperson') THEN
        ALTER TABLE quotes ADD COLUMN salesperson VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='quote_type') THEN
        ALTER TABLE quotes ADD COLUMN quote_type VARCHAR(50) DEFAULT 'quote'; -- 'quote' or 'estimate'
    END IF;
END $$;

-- Add salesperson field to invoices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='salesperson') THEN
        ALTER TABLE invoices ADD COLUMN salesperson VARCHAR(255);
    END IF;
END $$;

-- Ensure sent_at tracking exists (already in schema)
-- No changes needed for sent_at as it already exists

-- Migration completed

