-- Add email_otp_secret column to user_2fa_settings for storing temporary login OTP
ALTER TABLE user_2fa_settings 
ADD COLUMN IF NOT EXISTS email_otp_secret VARCHAR(255);

-- Update the secret column to allow NULL since it's not required for email-based 2FA
ALTER TABLE user_2fa_settings 
ALTER COLUMN secret DROP NOT NULL;

