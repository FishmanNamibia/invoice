# Quick Start Guide

Get your Financial Management System up and running in 5 minutes!

## Prerequisites Check

Make sure you have these installed:
```bash
# Check Node.js (should be v14+)
node --version

# Check npm
npm --version

# Check PostgreSQL (should be v12+)
psql --version
```

If any are missing, install them:
- Node.js: https://nodejs.org/
- PostgreSQL: https://www.postgresql.org/download/

## Step-by-Step Setup

### 1. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your favorite editor
nano .env
# or
code .env
```

**Minimum required configuration:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financials_db
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
JWT_SECRET=change_this_to_a_long_random_string
```

### 2. Install Dependencies

```bash
# Install backend dependencies (from project root)
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

This might take 2-3 minutes depending on your internet speed.

### 3. Create Database

```bash
# Login to PostgreSQL (you'll be prompted for password)
psql -U postgres

# Inside psql, create the database:
CREATE DATABASE financials_db;

# Exit psql
\q
```

**Alternative using command line:**
```bash
createdb -U postgres financials_db
```

### 4. Initialize Database Schema

```bash
# Run the initialization script
npm run init-db
```

You should see:
```
Connected successfully!
Database schema created successfully!
✅ Database initialization complete!
```

### 5. Start the Application

```bash
# Start both backend and frontend
npm run dev
```

Wait for:
```
🚀 Server is running on port 5000
Compiled successfully!
```

### 6. Open Your Browser

Navigate to: **http://localhost:3000**

## First Time Usage

### Register Your Company

1. Click **"Register here"** on the login page
2. Fill in the form:
   - **Company Name**: Your business name
   - **Email**: Your email (used for login)
   - **Password**: At least 6 characters
   - **Your Name**: First and last name
   - Other fields are optional

3. Click **"Create Account"**

You'll be automatically logged in and redirected to the dashboard!

### Create Your First Invoice

1. **Add a Customer** (Customers page → Add Customer)
   - Customer Name: "John Doe"
   - Email: john@example.com
   - Payment Terms: Net 30

2. **Add an Item** (Items page → Add Item)
   - Item Name: "Consulting Services"
   - Unit Price: 100.00
   - Item Type: Service

3. **Create Invoice** (Invoices page → New Invoice)
   - Select your customer
   - Add line items
   - Review totals
   - Click "Create Invoice"

Done! 🎉

## Troubleshooting

### Port 5000 already in use
```bash
# Kill the process
lsof -ti:5000 | xargs kill -9

# Or change port in .env
PORT=5001
```

### Port 3000 already in use
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9
```

### Database connection failed
```bash
# Check if PostgreSQL is running
pg_isready

# macOS - restart PostgreSQL
brew services restart postgresql

# Linux - restart PostgreSQL
sudo systemctl restart postgresql

# Check your .env file has correct credentials
```

### "Cannot find module" errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

cd client
rm -rf node_modules package-lock.json
npm install
cd ..
```

### Fresh start needed?
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS financials_db;"
psql -U postgres -c "CREATE DATABASE financials_db;"

# Reinitialize
npm run init-db

# Restart app
npm run dev
```

## Testing Credentials

For testing, you can use these sample data:

**Company Registration:**
- Company Name: Test Company Inc
- Email: admin@testcompany.com
- Password: test123456
- First Name: Admin
- Last Name: User

**Sample Customer:**
- Name: ABC Corporation
- Email: contact@abc.com
- Phone: +1 555-0100
- Payment Terms: Net 30

**Sample Item:**
- Name: Professional Services
- Price: $150.00/hour
- Type: Service

## Default URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health**: http://localhost:5000/api/health

## Next Steps

1. ✅ Customize your company profile
2. ✅ Add your customers
3. ✅ Create your item catalog
4. ✅ Generate your first invoice
5. ✅ Record payments
6. ✅ View reports

## Useful Commands

```bash
# Development mode (both frontend and backend)
npm run dev

# Backend only
npm run server

# Frontend only (from client directory)
cd client && npm start

# Build for production
npm run build

# Start production server
npm start

# Reset database
npm run init-db
```

## Getting Help

- Read the full **README.md** for detailed documentation
- Check the **API Endpoints** section in README
- Review the **Database Schema** section
- Look at the **Troubleshooting** section

## What's Included

✅ Multi-tenant architecture
✅ User authentication & authorization  
✅ Customer management
✅ Invoice creation & tracking
✅ Quote/estimate generation
✅ Payment recording & allocation
✅ Items/products catalog
✅ Financial dashboard
✅ Income statement reports
✅ Modern, responsive UI
✅ Mobile-friendly design

## Security Notes

🔒 **Important for Production:**
1. Change the `JWT_SECRET` in .env to a strong random string
2. Use strong database passwords
3. Enable HTTPS
4. Set `NODE_ENV=production`
5. Never commit your `.env` file

---

**Need Help?** Check the full README.md or review the code comments!

**Enjoy your Financial Management System! 🚀**



