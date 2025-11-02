# Setup Instructions - Action Required

## ✅ What's Been Done

1. ✅ Backend dependencies installed (237 packages)
2. ✅ Frontend dependencies installed (1367 packages)
3. ✅ All code files created (43 files)
4. ✅ Project structure complete

## ⚠️ What You Need to Do

### Step 1: Configure Database Access

PostgreSQL is installed but needs configuration. Please do ONE of the following:

#### Option A: Create .env file manually (Recommended)

Create a file named `.env` in the `/Users/salmonuulenga/financials/` folder with this content:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financials_db
DB_USER=salmonuulenga
DB_PASSWORD=

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_password

# Application URLs
APP_URL=http://localhost:3000
API_URL=http://localhost:5000
```

**Important:** If your PostgreSQL requires a password, add it after `DB_PASSWORD=`

#### Option B: Use PostgreSQL without password (macOS default)

If you installed PostgreSQL via Homebrew with default settings, it should work without a password.

### Step 2: Create the Database

Open Terminal and run:

```bash
cd /Users/salmonuulenga/financials

# Create database (try without password first)
createdb financials_db

# If that doesn't work, try:
createdb -U salmonuulenga financials_db

# Or if you have a postgres user:
createdb -U postgres financials_db
```

### Step 3: Initialize Database Schema

```bash
cd /Users/salmonuulenga/financials
npm run init-db
```

You should see: `✅ Database initialization complete!`

### Step 4: Start the Application

```bash
npm run dev
```

Wait for:
- `🚀 Server is running on port 5000`
- `Compiled successfully!`

### Step 5: Open in Browser

Go to: **http://localhost:3000**

---

## 🔧 Troubleshooting

### If createdb fails with "permission denied"

Try:
```bash
# Check PostgreSQL status
brew services list | grep postgres

# Start PostgreSQL if not running
brew services start postgresql@14
# or
brew services start postgresql
```

### If you need to set PostgreSQL password

```bash
# Connect to PostgreSQL
psql postgres

# Set password (optional)
ALTER USER salmonuulenga WITH PASSWORD 'your_password';

# Exit
\q

# Then update .env file with your password
```

### If database already exists

```bash
# Just initialize the schema
npm run init-db
```

### If port 5000 or 3000 is busy

```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

---

## 📞 Quick Help

**PostgreSQL not starting?**
```bash
brew services restart postgresql@14
```

**Need to start fresh?**
```bash
dropdb financials_db
createdb financials_db
npm run init-db
```

**Check if PostgreSQL is running:**
```bash
pg_isready
```

---

## 🎯 Once Running

1. Register your company at http://localhost:3000/register
2. Add customers
3. Create items
4. Generate invoices!

**All code is ready - you just need to set up the database connection!**



