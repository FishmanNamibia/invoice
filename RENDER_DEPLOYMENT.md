# 🚀 Render.com Deployment Guide - DynaFinances

Deploy your Financial Management System to Render.com in 10 minutes!

---

## ✅ Why Render.com?

Perfect for your application because:
- ✅ Supports Node.js + PostgreSQL (exactly what you need)
- ✅ Deploys directly from GitHub (automatic updates)
- ✅ Free SSL certificates (HTTPS)
- ✅ Managed database (no maintenance)
- ✅ Auto-scaling and backups
- ✅ Simple pricing ($14/month)

---

## 📋 Prerequisites

- ✅ GitHub repository: https://github.com/FishmanNamibia/invoice
- ✅ Render.com account (free to sign up)
- ✅ 10 minutes of time

---

## 🚀 Step-by-Step Deployment

### Step 1: Sign Up for Render

1. Go to https://render.com
2. Click **"Get Started"**
3. Sign up with **GitHub** (easiest way)
4. Authorize Render to access your repositories

---

### Step 2: Create PostgreSQL Database

1. From Render Dashboard, click **"New +"**
2. Select **"PostgreSQL"**
3. Configure:
   ```
   Name: dynafinances-db
   Database: financials_prod
   User: financials_user
   Region: Singapore (closest to you)
   Plan: Starter ($7/month)
   ```
4. Click **"Create Database"**
5. **Important**: Copy the **Internal Database URL** (you'll need this)

---

### Step 3: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Click **"Connect a repository"**
3. Select: **`FishmanNamibia/invoice`**
4. Click **"Connect"**

---

### Step 4: Configure Web Service

Fill in these settings:

#### Basic Settings
```
Name: dynafinances
Region: Singapore
Branch: main
Root Directory: (leave empty)
Runtime: Node
```

#### Build & Deploy
```
Build Command:
npm install && cd client && npm install && npm run build && cd ..

Start Command:
npm start
```

#### Environment
```
Plan: Starter ($7/month)
Auto-Deploy: Yes (recommended)
```

---

### Step 5: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these variables:

```env
NODE_ENV=production
PORT=10000

# Database (Use Internal Database URL from Step 2)
DATABASE_URL=[paste your Internal Database URL here]

# Extract these from DATABASE_URL and add separately:
DB_HOST=[from DATABASE_URL]
DB_PORT=5432
DB_NAME=financials_prod
DB_USER=financials_user
DB_PASSWORD=[from DATABASE_URL]

# JWT Secret (generate new one)
JWT_SECRET=[generate with: node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"]

# Session Secret
SESSION_SECRET=[generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]

# Email Configuration
SMTP_HOST=invoice.dynaverseinvestment.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@invoice.dynaverseinvestment.com
SMTP_PASSWORD=Shange@12

# Frontend URL (will be: https://dynafinances.onrender.com)
FRONTEND_URL=https://dynafinances.onrender.com

# CORS Origins
CORS_ORIGINS=https://dynafinances.onrender.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Email
ADMIN_EMAIL=info@invoice.dynaverseinvestment.com
```

---

### Step 6: Deploy!

1. Click **"Create Web Service"**
2. Render will start building your app
3. Watch the logs (takes 3-5 minutes)
4. ✅ Done when you see: "Server is running on port 10000"

---

### Step 7: Initialize Database

Once deployed, you need to run migrations:

1. Go to your web service dashboard
2. Click **"Shell"** tab (opens terminal)
3. Run:
   ```bash
   npm run init-db
   npm run create-admin
   ```
4. Follow prompts to create system admin

---

### Step 8: Access Your App!

Your app is now live at:
```
https://dynafinances.onrender.com
```

**Login with system admin credentials you just created!**

---

## 🔧 Configuration Details

### Understanding Database URL

Render provides a `DATABASE_URL` like:
```
postgres://user:password@host:5432/database
```

You need to extract and add separately:
- **DB_HOST**: The host part
- **DB_USER**: The user part
- **DB_PASSWORD**: The password part
- **DB_NAME**: The database part

Or use this script to extract:
```bash
# In Render Shell
node -e "
const url = process.env.DATABASE_URL;
const match = url.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
console.log('DB_HOST=' + match[3]);
console.log('DB_USER=' + match[1]);
console.log('DB_PASSWORD=' + match[2]);
console.log('DB_NAME=' + match[5]);
"
```

---

## 🌐 Custom Domain (Optional)

### Add Your Own Domain

1. Go to **"Settings"** → **"Custom Domain"**
2. Click **"Add Custom Domain"**
3. Enter your domain: `yourdomain.com`
4. Add DNS records (Render shows you which ones):
   ```
   Type: CNAME
   Name: @
   Value: dynafinances.onrender.com
   ```
5. Wait for DNS propagation (5-60 minutes)
6. SSL certificate automatically provisioned!

---

## 💰 Pricing Breakdown

### Monthly Costs

| Service | Plan | Cost |
|---------|------|------|
| Web Service | Starter | $7/month |
| PostgreSQL | Starter | $7/month |
| **Total** | | **$14/month** |

### What's Included:
- ✅ 24/7 running app
- ✅ 500MB RAM (web)
- ✅ 1GB database storage
- ✅ Automated backups (7 days)
- ✅ Free SSL
- ✅ 100GB bandwidth/month
- ✅ Auto-scaling
- ✅ Rolling deployments

### Free Tier Option:
- **$0/month** (both web + database free)
- App sleeps after 15 minutes of inactivity
- Wakes up on first request (15 second delay)
- Good for testing only

---

## 🔄 Automatic Deployments

### How it Works:
1. Push code to GitHub main branch
2. Render automatically detects changes
3. Rebuilds and redeploys
4. Zero downtime deployment
5. Automatic rollback if build fails

### Manual Deploy:
1. Go to web service dashboard
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## 📊 Monitoring

### View Logs:
1. Web Service dashboard → **"Logs"** tab
2. Real-time streaming logs
3. Filter by level (info, error, etc.)

### Check Metrics:
1. Dashboard → **"Metrics"** tab
2. CPU, Memory, Request rates
3. Response times

### Health Checks:
Render automatically monitors:
```
https://dynafinances.onrender.com/api/health
```

---

## 🐛 Troubleshooting

### Build Fails?

**Check Build Logs:**
- Most common: Missing dependencies
- Solution: Ensure all packages in `package.json`

**Frontend Build Issues:**
```bash
# Build command should be:
npm install && cd client && npm install && npm run build && cd ..
```

### App Crashes on Start?

**Check:**
1. Environment variables are set correctly
2. DATABASE_URL is valid
3. Port is set to 10000 (Render requirement)

**View crash logs:**
- Dashboard → "Logs" tab
- Look for error messages

### Database Connection Errors?

**Verify:**
1. PostgreSQL database is running
2. DATABASE_URL environment variable is set
3. Internal Database URL is used (not External)
4. Database user has permissions

**Test connection:**
```bash
# In Shell tab
psql $DATABASE_URL
```

### Can't Access App?

**Check:**
1. Deployment status is "Live"
2. Health check passes: `/api/health`
3. No error logs showing

---

## 🔐 Security Best Practices

### Before Going Live:

1. **Change JWT_SECRET**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
   ```

2. **Change SESSION_SECRET**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Update CORS_ORIGINS**:
   - Set to your actual domain
   - Remove localhost

4. **Secure System Admin**:
   - Create strong admin password
   - Enable 2FA for admin account

5. **Database Backups**:
   - Render automatically backs up (7 days)
   - Download manual backup: Dashboard → "Backups"

---

## 📈 Scaling

### Upgrade Plans When Needed:

**Web Service:**
- **Starter** ($7): 512MB RAM, 0.5 CPU
- **Standard** ($25): 2GB RAM, 1 CPU (recommended for production)
- **Pro** ($85): 4GB RAM, 2 CPU

**PostgreSQL:**
- **Starter** ($7): 1GB storage
- **Standard** ($20): 10GB storage, point-in-time recovery
- **Pro** ($90): 256GB storage, HA setup

---

## 🎯 Post-Deployment Checklist

After deployment, verify:

- [ ] App accessible at Render URL
- [ ] Database migrations ran successfully
- [ ] System admin account created
- [ ] Login works
- [ ] Can create invoice
- [ ] Can create quote
- [ ] Email sending works
- [ ] PDF generation works
- [ ] 2FA works (if enabled)
- [ ] All environment variables set
- [ ] Custom domain configured (if using)
- [ ] SSL certificate active

---

## 🔄 Updating Your App

### To Deploy Changes:

```bash
# On your local machine
git add .
git commit -m "Your update message"
git push origin main

# Render automatically deploys!
```

### Or Manual Deploy:
1. Go to Render dashboard
2. Click "Manual Deploy"
3. Select latest commit
4. Deploy

---

## 💡 Pro Tips

1. **Use Internal Database URL**: Faster, free data transfer
2. **Enable Auto-Deploy**: Push to GitHub, auto-deploys
3. **Set up Notifications**: Get alerts for failed deployments
4. **Use Environment Groups**: Share env vars across services
5. **Monitor Logs**: Check regularly for errors
6. **Download Backups**: Monthly database backup downloads

---

## 📞 Support

### Render Support:
- **Docs**: https://render.com/docs
- **Community**: https://community.render.com
- **Email**: support@render.com

### Your App Issues:
- **Repository**: https://github.com/FishmanNamibia/invoice/issues
- **Email**: info@invoice.dynaverseinvestment.com

---

## ✅ Success!

Your app is now:
- ✅ Live on the internet
- ✅ Running 24/7
- ✅ Automatically backed up
- ✅ SSL secured (HTTPS)
- ✅ Auto-deploying from GitHub
- ✅ Scalable as you grow

**Access your app**: https://dynafinances.onrender.com

---

## 🚀 Next Steps

1. **Test Everything**: Create invoices, quotes, customers
2. **Add Custom Domain**: Use your own domain name
3. **Enable 2FA**: For system admin security
4. **Invite Users**: Add team members
5. **Start Using**: Begin managing your finances!

---

**Congratulations on your deployment!** 🎉

Your financial management system is now production-ready and accessible worldwide!

