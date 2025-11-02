-- Migration: Change logo_url from VARCHAR(500) to TEXT to support large base64 images
-- Run this SQL to update the schema

-- Check if column exists and change it to TEXT
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='companies' AND column_name='logo_url') THEN
        -- Change the column type to TEXT (unlimited length)
        ALTER TABLE companies ALTER COLUMN logo_url TYPE TEXT;
        RAISE NOTICE 'Column logo_url changed to TEXT successfully';
    ELSE
        RAISE NOTICE 'Column logo_url does not exist';
    END IF;
END $$;



