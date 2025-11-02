-- Add bank account details to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS routing_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS swift_bic VARCHAR(50),
ADD COLUMN IF NOT EXISTS iban VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_address TEXT;

-- Add comment for documentation
COMMENT ON COLUMN companies.bank_name IS 'Name of the bank';
COMMENT ON COLUMN companies.account_holder_name IS 'Account holder name (business name on the account)';
COMMENT ON COLUMN companies.account_number IS 'Bank account number';
COMMENT ON COLUMN companies.routing_number IS 'Routing number / Sort code / BSB (country-specific)';
COMMENT ON COLUMN companies.swift_bic IS 'SWIFT/BIC code for international transfers';
COMMENT ON COLUMN companies.iban IS 'IBAN for international transfers';
COMMENT ON COLUMN companies.bank_address IS 'Bank branch address (optional)';

