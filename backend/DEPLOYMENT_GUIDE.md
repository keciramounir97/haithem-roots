# 🚀 Deployment Guide - Roots Maghreb Backend

## ✅ Critical Fixes Applied

### 1. **Prisma Lazy Loading** ✅
- Prisma client is **NO LONGER** created at startup
- Only initializes when first accessed (lazy loading)
- **Prevents 500 errors** from DB connection attempts at startup

### 2. **Security Headers** ✅
- `X-Content-Type-Options: nosniff` on **ALL** responses
- Fixes webhint warnings
- Additional security headers configured

### 3. **Root Route** ✅
- Simple `200 OK` response (text/plain)
- **No database calls, no Prisma, no async operations**
- Bulletproof for Passenger health checks

### 4. **CORS Configuration** ✅
- Allows **ALL origins** (as requested)
- Proper credentials handling
- Complete OPTIONS preflight support

---

## 📋 Deployment Steps

### Step 1: Upload Files to Server

Upload your `backend/` directory to:
```
/home/USERNAME/newbackend/backend
```

**Important:** Make sure the path matches your cPanel configuration:
- **Application root:** `newbackend/backend`

### Step 2: Install Dependencies

SSH into your server and run:
```bash
cd ~/newbackend/backend
npm install --production
```

**OR** if using nodevenv:
```bash
cd ~/newbackend/backend
~/nodevenv/newbackend/backend/24/bin/npm install --production
```

### Step 3: Generate Prisma Client

```bash
npx prisma generate
```

**OR** with nodevenv:
```bash
~/nodevenv/newbackend/backend/24/bin/npx prisma generate
```

### Step 4: Configure Environment Variables

Create/update `.env` file in `~/newbackend/backend/.env`:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL="your_database_connection_string"
JWT_SECRET="your_jwt_secret"
```

**Important:** Never commit `.env` to Git!

### Step 5: Configure cPanel Application

In cPanel's Node.js Application Manager:

| Field | Value |
|-------|-------|
| **Node.js version** | `24.6.0` (or available 24.x) |
| **Application mode** | `Production` |
| **Application root** | `newbackend/backend` ⚠️ **NOT** `backendOne` |
| **Application URL** | `backend.rootsmaghreb.com` |
| **Application startup file** | `server.js` |
| **Passenger log file** | `/home/USERNAME/logs/passenger.log` |

#### Environment Variables (Add in cPanel):
Click **"+ ADD VARIABLE"** and add:

1. `NODE_ENV` = `production`
2. `PORT` = `5000`
3. (Optional) `DEBUG_PRISMA` = `false`

### Step 6: Restart Application

In cPanel, click **"RESTART"** or create restart file:
```bash
cd ~/newbackend/backend
mkdir -p tmp
touch tmp/restart.txt
```

### Step 7: Verify Deployment

Test the root endpoint:
```bash
curl -I https://backend.rootsmaghreb.com/
```

**Expected response:**
```
HTTP/2 200
x-content-type-options: nosniff
content-type: text/plain
```

Test health endpoint:
```bash
curl https://backend.rootsmaghreb.com/health
```

Test API info:
```bash
curl https://backend.rootsmaghreb.com/api/info
```

---

## 🔍 Troubleshooting

### If you get 500 error:

1. **Check Passenger logs:**
   ```bash
   tail -50 ~/logs/passenger.log
   ```

2. **Common issues:**
   - ❌ Prisma client not generated → Run `npx prisma generate`
   - ❌ Missing DATABASE_URL → Check `.env` file
   - ❌ Wrong application root → Check cPanel config
   - ❌ Node version mismatch → Check cPanel Node.js version

3. **Verify Prisma is lazy-loaded:**
   - Server should start **without** connecting to DB
   - Only connects when API route is accessed
   - Root route `/` should work immediately

### Check Route Loading:

```bash
# Check if routes loaded successfully
tail -20 ~/logs/passenger.log | grep "routes loaded"
```

Should see:
```
✅ All routes loaded successfully
```

### Database Connection Issues:

If database is unavailable, the server will still start:
- ✅ Root route `/` works (no DB)
- ✅ Health endpoints work (no DB)
- ❌ API routes may fail (but won't crash server)

---

## 📊 File Structure

```
/home/USERNAME/newbackend/backend/
├── server.js              # Main entry point (Passenger-compatible)
├── .env                   # Environment variables (NOT in Git)
├── package.json           # Dependencies
├── .htaccess.production   # Apache/Passenger config
├── tmp/                   # Restart directory
│   └── restart.txt        # Touch this to restart Passenger
├── src/
│   ├── lib/
│   │   └── prisma.js      # LAZY-LOADED Prisma client ✅
│   ├── routes/            # All API routes
│   ├── controllers/       # Route handlers
│   └── ...
└── node_modules/          # Dependencies
```

---

## 🔒 Security Checklist

- ✅ `X-Content-Type-Options: nosniff` on all responses
- ✅ CORS configured for all origins
- ✅ Security headers configured
- ✅ `.env` file protected (not downloadable)
- ✅ Prisma lazy-loaded (no DB at startup)

---

## 🚨 What Changed (Why it works now)

### Before (❌ Caused 500):
```js
// src/lib/prisma.js
const prisma = new PrismaClient(); // ❌ Created at startup
```
- Prisma tried to connect to DB immediately
- If DB unavailable → 500 error
- Server couldn't start without DB

### After (✅ Works):
```js
// src/lib/prisma.js
// Prisma only created when first accessed (lazy loading)
const prisma = getPrisma(); // ✅ Created on demand
```
- Server starts **without** DB connection
- Prisma connects only when API route accessed
- Root route works immediately
- Health checks work without DB

---

## 📞 Support

If issues persist:
1. Check `~/logs/passenger.log`
2. Verify all environment variables
3. Ensure Prisma client is generated
4. Verify Node.js version matches (24.x)

**The server is now production-ready!** ✅
