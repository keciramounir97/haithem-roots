# 🚀 Quick Start Guide - Backend Server

## ✅ **Server Status: RUNNING**

The backend server is now **running on port 5000**.

---

## 🔧 **What Was Fixed**

### Problem: `ERR_CONNECTION_REFUSED`
- **Cause:** Backend server was not running
- **Fix:** Server now starts on port 5000 (matches frontend expectations)

### Port Configuration:
- **Local Development:** Port `5000` (frontend expects this)
- **Production (Passenger):** Port set via `PORT` environment variable (e.g., `5000` from `.htaccess`)

---

## 📋 **How to Start/Stop Server**

### Start Server:
```bash
cd "D:\Nouveau dossier\projet-kamel\backend"
npm start
```

**OR** run directly:
```bash
node server.js
```

### Stop Server:
- Press `Ctrl+C` in the terminal
- **OR** kill the process:
```powershell
Get-Process node | Stop-Process -Force
```

---

## ✅ **Verify Server is Running**

### Test Root Endpoint:
```bash
curl http://localhost:5000/
```

**Expected:** `OK`

### Test Health Endpoint:
```bash
curl http://localhost:5000/health
```

**Expected:** JSON with status, uptime, memory info

### Test API Endpoint:
```bash
curl http://localhost:5000/api/trees
```

**Expected:** JSON response (200 OK)

---

## 🌐 **Frontend Connection**

Your frontend is configured to connect to:
- **Development:** `http://localhost:5000/api` ✅
- **Production:** `https://backend.rootsmaghreb.com/api` ✅

### Current Status:
- ✅ Server running on port `5000`
- ✅ Frontend configured for port `5000` (dev mode)
- ✅ CORS enabled for all origins
- ✅ Security headers configured

---

## 🐛 **Troubleshooting**

### If you still see `ERR_CONNECTION_REFUSED`:

1. **Check if server is running:**
   ```powershell
   Get-Process node
   ```
   If empty → Server is not running

2. **Check if port 5000 is in use:**
   ```powershell
   netstat -ano | findstr :5000
   ```
   Should show Node.js listening on port 5000

3. **Check server logs:**
   - Look at terminal where server is running
   - Should see: `🚀 Server running on port 5000`

4. **Restart server:**
   ```bash
   # Stop any running instances
   Get-Process node | Stop-Process -Force
   
   # Start fresh
   cd "D:\Nouveau dossier\projet-kamel\backend"
   npm start
   ```

---

## 📊 **Server Endpoints**

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/` | Root (health check) | ✅ Works |
| `/health` | System health | ✅ Works |
| `/api/*` | All API routes | ✅ Works |
| `/api/auth/*` | Authentication | ✅ Works |
| `/api/trees` | Family trees | ✅ Works |
| `/api/books` | Books | ✅ Works |
| `/api/gallery` | Gallery | ✅ Works |

---

## 🔥 **Quick Commands**

```bash
# Start server
npm start

# Check server status
curl http://localhost:5000/health

# Test API
curl http://localhost:5000/api/trees

# Check if running
Get-Process node
```

---

**The server is now running and ready to accept requests!** ✅

Refresh your frontend - the `ERR_CONNECTION_REFUSED` errors should be gone.
