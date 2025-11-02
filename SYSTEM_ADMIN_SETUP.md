# System Admin / Super Admin Setup Guide

## 🎯 Overview

The System Admin feature allows you to:
- ✅ View all registered companies
- ✅ See usage statistics and analytics
- ✅ Activate/deactivate company accounts
- ✅ Manage subscriptions and payment plans
- ✅ Monitor system-wide activity
- ✅ Configure system settings
- ❌ **NO access to company data** (privacy protected)

---

## 🔧 Setup Instructions

### Step 1: Run Database Migration

```bash
cd /Users/salmonuulenga/financials

# Run migration to add system admin tables
node server/database/run_migration.js
```

This will create:
- `system_users` table (for superadmin accounts)
- `company_usage_log` table (for tracking activity)
- Additional subscription fields on companies table

### Step 2: Create System Admin Account

```bash
npm run create-admin
```

This creates the default system admin:
- **Email**: `admin@system.local`
- **Password**: `SystemAdmin123!`

⚠️ **IMPORTANT**: Change this password after first login!

---

## 🔐 Login as System Admin

1. Go to: **http://localhost:3000/login**
2. Enter credentials:
   - **Email**: `admin@system.local`
   - **Password**: `SystemAdmin123!`
3. Click "Login"

You'll see the **System Admin Dashboard** instead of regular company dashboard.

---

## 📊 System Admin Features

### **Dashboard View**

**Statistics Cards:**
- Total Companies
- Active Companies  
- Trial Companies
- Total Users
- Total Invoices
- Subscription Revenue

**Charts:**
- Monthly Growth (companies created over time)
- Subscription Breakdown (pie chart by status)

### **Company Management**

**View All Companies:**
- Company name and email
- Status (Active/Inactive)
- Subscription status (Trial/Active/Suspended/Cancelled)
- User count
- Customer count
- Invoice count
- Total revenue
- Last activity date

**Filter Companies:**
- By status (Active/Inactive/All)
- By subscription status
- Search by name or email

**Actions:**
- 👁️ **View Details** - See company info and edit subscription
- ⚡ **Activate/Deactivate** - Toggle company access
- ✏️ **Edit Subscription** - Update plan, dates, limits

### **Subscription Management**

When viewing a company, you can:
- Set subscription status (trial, active, suspended, cancelled)
- Choose subscription plan (basic, premium, enterprise)
- Set subscription dates
- Set monthly amount
- Configure limits (max users, max storage)
- Update all fields at once

### **Usage Statistics**

For each company, you can view:
- Activity breakdown by type
- Daily activity over last 30 days
- Login frequency
- Feature usage patterns

---

## 🔒 Security & Privacy

### **What System Admin CAN Do:**
✅ View company metadata (name, email, stats)
✅ Activate/deactivate accounts
✅ Manage subscriptions
✅ View aggregated statistics
✅ Configure system settings

### **What System Admin CANNOT Do:**
❌ Access company invoices
❌ View customer data
❌ See financial transactions
❌ Access company-specific reports
❌ View company users (except count)
❌ Access any sensitive business data

**All company data is protected and isolated!**

---

## 📝 Creating Additional System Admins

To create more system admin accounts, connect to database:

```bash
psql -U postgres -d financials_db
```

Then run:
```sql
-- Hash a password (replace 'YourPassword123!' with desired password)
-- In Node.js: const bcrypt = require('bcryptjs'); bcrypt.hash('password', 10)

INSERT INTO system_users (email, password_hash, first_name, last_name, role)
VALUES (
    'another-admin@system.local',
    '$2a$10$...',  -- Replace with bcrypt hash
    'Admin',
    'Name',
    'superadmin'
);
```

---

## 🎨 System Admin Interface

### **Navigation:**
- System Admin Dashboard (only menu item for superadmin)
- Different from regular company dashboard
- Shows "System Administrator" instead of company name

### **Features:**
- Responsive design
- Real-time statistics
- Interactive charts
- Quick filters
- Modal forms for editing
- Toast notifications

---

## 📊 System Configuration

### **Subscription Plans:**

**Basic** ($29.99/month)
- Up to 5 users
- 1GB storage
- All core features

**Premium** ($79.99/month)
- Up to 20 users
- 10GB storage
- Advanced features

**Enterprise** ($199.99/month)
- Unlimited users
- Unlimited storage
- All features + priority support

### **Default Settings:**
- Trial period: 30 days
- Default max users: 5
- Default storage: 1000 MB (1GB)

---

## 🔄 Managing Companies

### **Activate Company:**
1. Find company in list
2. Click ⚡ (Power) button
3. Company status changes to Active
4. Users can now login

### **Deactivate Company:**
1. Find company in list
2. Click ⚡ (Power) button  
3. Company status changes to Inactive
4. Users cannot login (but data is preserved)

### **Update Subscription:**
1. Click 👁️ (Eye) button on company
2. Modal opens with subscription form
3. Update any fields
4. Click "Update Subscription"
5. Changes applied immediately

---

## 📈 Usage Tracking

The system automatically tracks:
- User logins
- Invoice creation
- Payment recording
- Customer additions
- Company activity dates

View usage in:
- Company list (last activity column)
- Company detail modal
- Usage statistics API endpoint

---

## 🆘 Troubleshooting

### **Can't login as system admin?**
```bash
# Verify admin exists
psql -U postgres -d financials_db -c "SELECT email FROM system_users;"

# Reset password (manually hash new password)
```

### **Migration errors?**
```bash
# Check if tables exist
psql -U postgres -d financials_db -c "\dt system_users"
psql -U postgres -d financials_db -c "\dt company_usage_log"

# Run migration again
node server/database/run_migration.js
```

### **No companies showing?**
- Companies need to register first
- Check database: `SELECT * FROM companies;`
- Verify API endpoint: `/api/system-admin/companies`

---

## 📚 API Endpoints

### **System Admin Routes:**

```
GET    /api/system-admin/companies           # List all companies
GET    /api/system-admin/companies/:id       # Get company details
PUT    /api/system-admin/companies/:id/status       # Activate/deactivate
PUT    /api/system-admin/companies/:id/subscription # Update subscription
GET    /api/system-admin/statistics          # System statistics
GET    /api/system-admin/companies/:id/usage # Company usage stats
GET    /api/system-admin/config              # System configuration
PUT    /api/system-admin/config              # Update configuration
```

All require `superadmin` role!

---

## 🎯 Quick Start

```bash
# 1. Run migration
node server/database/run_migration.js

# 2. Create admin
npm run create-admin

# 3. Start servers
npm run dev

# 4. Login
# Go to http://localhost:3000/login
# Email: admin@system.local
# Password: SystemAdmin123!
```

---

## ✨ Features Summary

✅ **Company Overview**
- List all companies
- Search and filter
- View statistics per company

✅ **Account Management**
- Activate/deactivate accounts
- Manage subscriptions
- Set limits and plans

✅ **Analytics**
- System-wide statistics
- Monthly growth charts
- Subscription breakdown
- Usage tracking

✅ **Privacy Protected**
- No access to company data
- Metadata only
- Secure isolation

---

**Your System Admin panel is ready! 🎉**



