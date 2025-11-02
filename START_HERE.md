# 🚀 START HERE - Complete Setup Guide

## ✅ What's Already Done

✅ All code files created (43 files)  
✅ Backend dependencies installed  
✅ Frontend dependencies installed  
✅ `.env` file created  

## 📝 What You Need To Do (3 Simple Steps)

### Step 1: Set Up PostgreSQL Database

Open your Terminal and run these commands:

```bash
# Navigate to the project
cd /Users/salmonuulenga/financials

# Create the database (try this first - no password)
createdb financials_db
```

**If that works**, great! Skip to Step 2.

**If you get "password required" error**, try:

```bash
# Connect to PostgreSQL
psql postgres

# Inside psql, run:
CREATE DATABASE financials_db;

# Then exit
\q
```

**If psql asks for password**, you'll need to either:
- Enter your PostgreSQL password, OR
- Set up PostgreSQL to allow local connections without password

---

### Step 2: Initialize Database Schema

```bash
cd /Users/salmonuulenga/financials
npm run init-db
```

You should see:
```
✅ Database initialization complete!
```

---

### Step 3: Start the Application

```bash
npm run dev
```

Wait for these messages:
```
🚀 Server is running on port 5000
Compiled successfully!
```

Then open your browser to: **http://localhost:3000**

---

## 🎯 If PostgreSQL Needs a Password

If PostgreSQL keeps asking for a password, you have 2 options:

### Option A: Configure PostgreSQL to allow local connections (Recommended)

```bash
# Find your pg_hba.conf file
psql postgres -c "SHOW hba_file;"

# Edit it (you'll need your system password)
sudo nano /path/to/pg_hba.conf

# Change this line:
# local   all   all   peer
# TO:
# local   all   all   trust

# Restart PostgreSQL
brew services restart postgresql@14
# or
brew services restart postgresql
```

### Option B: Set a password in .env file

1. Set a PostgreSQL password:
```bash
psql postgres
ALTER USER salmonuulenga WITH PASSWORD 'mypassword123';
\q
```

2. Edit `.env` file and add the password:
```
DB_PASSWORD=mypassword123
```

---

## 🔧 Troubleshooting

### "createdb: command not found"
PostgreSQL is not in your PATH. Try:
```bash
/usr/local/bin/createdb financials_db
```

### "database already exists"
That's fine! Just run:
```bash
npm run init-db
```

### Port 5000 or 3000 already in use
```bash
# Kill port 5000
lsof -ti:5000 | xargs kill -9

# Kill port 3000
lsof -ti:3000 | xargs kill -9
```

### Need to start completely fresh?
```bash
# Drop database
dropdb financials_db
# or
psql postgres -c "DROP DATABASE financials_db;"

# Create it again
createdb financials_db

# Initialize
npm run init-db
```

---

## ✨ Once It's Running

1. **Register** your company at http://localhost:3000/register
2. **Login** with your credentials
3. **Add customers** (Customers page)
4. **Create items** (Items page)  
5. **Generate invoices** (Invoices → New Invoice)
6. **Record payments** (Payments → Record Payment)
7. **View reports** (Reports page)

---

## 📚 Documentation

- `README.md` - Full documentation
- `QUICKSTART.md` - Quick setup guide
- `CHEATSHEET.md` - Command reference
- `PROJECT_SUMMARY.md` - Project overview

---

## 🆘 Still Having Issues?

The most common issue is PostgreSQL authentication. Here's the simplest solution:

**Just use SQLite instead?** No - this system is designed for PostgreSQL which is much better for production.

**Try this:**
1. Check if PostgreSQL is running: `pg_isready`
2. If not, start it: `brew services start postgresql@14`
3. Create database: `createdb financials_db`
4. If password needed, just press Enter (try blank password first)

---

## 🎉 You're Almost There!

The entire application is built and ready. You just need to:
1. Create the database
2. Run `npm run init-db`
3. Run `npm run dev`
4. Open http://localhost:3000

**That's it! 🚀**



