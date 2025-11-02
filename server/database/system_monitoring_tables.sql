-- System Monitoring Tables Migration
-- This migration adds tables for login history, error logs, and system configuration

-- Login History Table
CREATE TABLE IF NOT EXISTS user_login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    login_successful BOOLEAN DEFAULT true,
    login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    logout_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_company_id ON user_login_history(company_id);
CREATE INDEX IF NOT EXISTS idx_login_history_timestamp ON user_login_history(login_timestamp);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON user_login_history(email);

-- Error Logs Table
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_level VARCHAR(50) DEFAULT 'error', -- error, warning, info, critical
    error_message TEXT NOT NULL,
    error_stack TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    request_url TEXT,
    request_method VARCHAR(10),
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for error logs
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(error_level);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_company_id ON error_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_occurred_at ON error_logs(occurred_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- System Configuration Table
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
    category VARCHAR(100) DEFAULT 'general', -- general, security, performance, features
    description TEXT,
    is_editable BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for system config
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

-- Insert default system configurations
INSERT INTO system_config (config_key, config_value, config_type, category, description, is_editable) VALUES
    ('system_name', 'Financial System', 'string', 'general', 'Name of the system', true),
    ('max_login_attempts', '5', 'number', 'security', 'Maximum failed login attempts before account lockout', true),
    ('session_timeout_minutes', '60', 'number', 'security', 'Session timeout in minutes', true),
    ('enable_two_factor', 'false', 'boolean', 'security', 'Enable two-factor authentication', true),
    ('min_password_length', '6', 'number', 'security', 'Minimum password length', true),
    ('enable_email_notifications', 'true', 'boolean', 'features', 'Enable email notifications', true),
    ('max_file_upload_size_mb', '10', 'number', 'features', 'Maximum file upload size in MB', true),
    ('enable_audit_log', 'true', 'boolean', 'security', 'Enable audit logging', true),
    ('maintenance_mode', 'false', 'boolean', 'general', 'Put system in maintenance mode', true),
    ('max_users_per_company', '10', 'number', 'features', 'Maximum users allowed per company', true),
    ('default_currency', 'USD', 'string', 'general', 'Default currency code', true),
    ('backup_frequency_days', '7', 'number', 'general', 'How often to backup data (in days)', true)
ON CONFLICT (config_key) DO NOTHING;

-- System Activity Log Table (for tracking important system events)
CREATE TABLE IF NOT EXISTS system_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_type VARCHAR(100) NOT NULL, -- login, logout, config_change, company_created, etc.
    activity_description TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    metadata JSONB,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for activity log
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON system_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON system_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_company_id ON system_activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_occurred_at ON system_activity_log(occurred_at);

COMMENT ON TABLE user_login_history IS 'Tracks all user login attempts and sessions';
COMMENT ON TABLE error_logs IS 'Stores application errors and exceptions for debugging';
COMMENT ON TABLE system_config IS 'System-wide configuration settings';
COMMENT ON TABLE system_activity_log IS 'Logs important system activities and changes';

