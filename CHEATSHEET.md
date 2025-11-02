# Financial System - Command Cheat Sheet

Quick reference for common commands and operations.

## 🚀 Setup Commands

```bash
# One-time setup (automated)
./setup.sh

# Manual setup
cp .env.example .env          # Configure environment
npm install                   # Install backend deps
cd client && npm install      # Install frontend deps
npm run init-db              # Initialize database
```

## 🏃 Running the Application

```bash
# Development mode (recommended) - runs both frontend & backend
npm run dev

# Backend only
npm run server

# Frontend only
cd client && npm start

# Production mode
npm run build                # Build frontend
npm start                    # Start production server
```

## 🗄️ Database Commands

```bash
# Create database
createdb -U postgres financials_db

# Drop database (⚠️ deletes all data)
dropdb -U postgres financials_db

# Initialize/Reset schema
npm run init-db

# Connect to database
psql -U postgres -d financials_db

# Backup database
pg_dump -U postgres financials_db > backup.sql

# Restore database
psql -U postgres financials_db < backup.sql
```

## 🔧 Troubleshooting Commands

```bash
# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9

# Check if PostgreSQL is running
pg_isready

# Restart PostgreSQL (macOS)
brew services restart postgresql

# Restart PostgreSQL (Linux)
sudo systemctl restart postgresql

# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📦 NPM Scripts

```bash
npm run dev          # Development mode (both servers)
npm run server       # Backend only
npm run client       # Frontend only
npm run build        # Build for production
npm start            # Production server
npm run init-db      # Initialize database
```

## 🗃️ PostgreSQL Quick Reference

```sql
-- Connect to database
\c financials_db

-- List all tables
\dt

-- Describe table structure
\d companies
\d invoices

-- View all companies
SELECT * FROM companies;

-- View all invoices
SELECT * FROM invoices;

-- Count records
SELECT COUNT(*) FROM customers;

-- Exit psql
\q
```

## 🌐 URLs

```
Frontend:      http://localhost:3000
Backend API:   http://localhost:5000
Health Check:  http://localhost:5000/api/health
```

## 📋 API Endpoints Quick Reference

### Authentication
```bash
POST /api/auth/register    # Register company
POST /api/auth/login       # Login
```

### Customers
```bash
GET    /api/customers      # List customers
POST   /api/customers      # Create customer
GET    /api/customers/:id  # Get customer
PUT    /api/customers/:id  # Update customer
DELETE /api/customers/:id  # Delete customer
```

### Invoices
```bash
GET    /api/invoices           # List invoices
POST   /api/invoices           # Create invoice
GET    /api/invoices/:id       # Get invoice
PUT    /api/invoices/:id       # Update invoice
DELETE /api/invoices/:id       # Delete invoice
GET    /api/invoices/stats/overview  # Statistics
```

### Quotes
```bash
GET    /api/quotes                  # List quotes
POST   /api/quotes                  # Create quote
GET    /api/quotes/:id              # Get quote
PUT    /api/quotes/:id              # Update quote
DELETE /api/quotes/:id              # Delete quote
POST   /api/quotes/:id/convert      # Convert to invoice
```

### Payments
```bash
GET    /api/payments       # List payments
POST   /api/payments       # Record payment
GET    /api/payments/:id   # Get payment
DELETE /api/payments/:id   # Delete payment
```

### Items
```bash
GET    /api/items          # List items
POST   /api/items          # Create item
GET    /api/items/:id      # Get item
PUT    /api/items/:id      # Update item
DELETE /api/items/:id      # Delete item
```

### Dashboard & Reports
```bash
GET /api/dashboard/overview                    # Dashboard data
GET /api/dashboard/reports/income-statement    # Income statement
```

## 🔒 Environment Variables

```env
# Required
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financials_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=change_this_secret

# Optional
PORT=5000
NODE_ENV=development
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@example.com
SMTP_PASSWORD=email_password
```

## 🧪 Testing with curl

```bash
# Register company
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Company",
    "email": "test@example.com",
    "password": "test123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'

# Get customers (with auth token)
curl http://localhost:5000/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Health check
curl http://localhost:5000/api/health
```

## 📁 Important Files

```
.env                          # Configuration (create from .env.example)
server/database/schema.sql    # Database schema
server/index.js              # Backend server
client/src/App.js            # Frontend app
README.md                    # Full documentation
QUICKSTART.md                # Quick setup guide
PROJECT_SUMMARY.md           # Project overview
```

## 🎯 Common Tasks

### Add a New Customer
1. Navigate to Customers
2. Click "Add Customer"
3. Fill in details
4. Save

### Create an Invoice
1. Go to Invoices → New Invoice
2. Select customer
3. Add line items
4. Review totals
5. Create

### Record a Payment
1. Go to Payments → Record Payment
2. Select customer
3. Allocate to invoices
4. Save

### Generate Report
1. Navigate to Reports
2. Select date range
3. Click "Generate Report"

## 💡 Tips

- Use the items catalog for faster invoicing
- Check dashboard regularly for overview
- Filter invoices by status
- Set payment terms per customer
- Use quote numbers for easy tracking
- Regular database backups recommended

## 🔍 Debugging

```bash
# View backend logs
npm run server    # Watch console

# View frontend logs
# Check browser console (F12)

# Database connection issues
# Check .env file credentials
# Ensure PostgreSQL is running: pg_isready

# Module not found
rm -rf node_modules && npm install
```

## 📞 Quick Help

- Setup issues → Check QUICKSTART.md
- Features → Check README.md
- Project info → Check PROJECT_SUMMARY.md
- This file → Quick commands reference

---

**Keep this file handy for quick reference! 📌**



