-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    system_user_id UUID REFERENCES system_users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_user_type CHECK (
        (user_id IS NOT NULL AND system_user_id IS NULL) OR
        (user_id IS NULL AND system_user_id IS NOT NULL)
    )
);

-- Two-Factor Authentication Settings Table
CREATE TABLE IF NOT EXISTS user_2fa_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    system_user_id UUID REFERENCES system_users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    secret VARCHAR(255) NOT NULL,
    backup_codes TEXT[], -- Array of backup codes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_user_type_2fa CHECK (
        (user_id IS NOT NULL AND system_user_id IS NULL) OR
        (user_id IS NULL AND system_user_id IS NOT NULL)
    ),
    UNIQUE(user_id),
    UNIQUE(system_user_id)
);

-- 2FA Verification Attempts (for rate limiting)
CREATE TABLE IF NOT EXISTS two_factor_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(100),
    successful BOOLEAN DEFAULT false,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id ON user_2fa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_system_user_id ON user_2fa_settings(system_user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_attempts_email ON two_factor_attempts(email);
CREATE INDEX IF NOT EXISTS idx_2fa_attempts_attempted_at ON two_factor_attempts(attempted_at);

-- Comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens for self-service password recovery';
COMMENT ON TABLE user_2fa_settings IS 'Stores two-factor authentication settings and secrets for users';
COMMENT ON TABLE two_factor_attempts IS 'Tracks 2FA verification attempts for rate limiting';

