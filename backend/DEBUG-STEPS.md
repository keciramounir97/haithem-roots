# 🚨 DEBUGGING PASSENGER STARTUP FAILURE

## Current Situation
- Apache is returning 500 error (HTML error page)
- Express app is NOT starting
- Need to isolate the exact failure point

---

## ✅ STEP 1: Test Minimal Server

### 1.1 Backup Current Server
```bash
cd /home/zgzqzmyr/newbackend/backend
cp server.js server.js.full.backup
```

### 1.2 Use Minimal Version
Copy the contents of `server.js.minimal` to `server.js`, or:

```bash
cp server.js.minimal server.js
```

### 1.3 Restart Passenger
```bash
mkdir -p tmp
touch tmp/restart.txt
```

### 1.4 Check Logs (CRITICAL)
```bash
tail -f ~/logs/passenger.log
```

Or check the last 50 lines:
```bash
tail -50 ~/logs/passenger.log
```

---

## 🔍 WHAT TO LOOK FOR IN LOGS

### 🟢 SUCCESS CASE
You should see:
```
=== PASSENGER BOOT START (MINIMAL) ===
Node version: v24.x.x
Working directory: /home/zgzqzmyr/newbackend/backend
PORT: 5000
✅ Minimal server configured
=== PASSENGER BOOT COMPLETE (MINIMAL) ===
```

Then test:
```bash
curl https://server.rootsmaghreb.com/
```

Should return JSON:
```json
{
  "status": "OK",
  "message": "Backend is alive (minimal mode)",
  "port": 5000,
  ...
}
```

✅ **If this works → Passenger can run Node.js**
→ Proceed to STEP 2: Add routes incrementally

---

### 🔴 FAILURE CASES

#### Case A: Module Not Found
```
Error: Cannot find module './src/routes/authRoutes'
```
**Fix**: Routes are still being loaded → Use minimal version

#### Case B: Prisma Error
```
PrismaClientInitializationError
Error: Can't reach database server
```
**Fix**: DB connection issue (expected in minimal mode, ignore for now)

#### Case C: Syntax Error
```
SyntaxError: Unexpected token
```
**Fix**: Node version mismatch or file encoding issue

#### Case D: Permission Error
```
EACCES: permission denied
```
**Fix**: File permissions issue

#### Case E: Node Version Mismatch
```
Error: The module was compiled against a different Node.js version
```
**Fix**: Run `npm rebuild` or reinstall node_modules

#### Case F: Missing Dependencies
```
Error: Cannot find module 'express'
```
**Fix**: Run `npm install --production`

---

## ✅ STEP 2: If Minimal Works - Add Routes Incrementally

Once minimal server works, we'll add routes one by one:

### 2.1 Add Routes Safely
Edit `server.js` and uncomment/add routes with proper error handling:

```js
// ROUTES - Load safely
let routesLoaded = false;
try {
  console.log("Attempting to load routes...");
  app.use("/api/auth", require("./src/routes/authRoutes"));
  console.log("✅ Auth routes loaded");
  // ... add others one by one
  routesLoaded = true;
  console.log("✅ All routes loaded");
} catch (err) {
  console.error("❌ Routes failed:", err.message);
  console.error("Stack:", err.stack);
  // Server continues without routes
}
```

### 2.2 Check Which Route Fails
The logs will show exactly which route file is causing the issue.

---

## ✅ STEP 3: Check Route File Dependencies

If a specific route fails, check its imports:

```bash
# Example: Check authRoutes
cat src/routes/authRoutes.js | head -20
```

Common issues:
- **Prisma not initialized** → Wrap Prisma calls in try/catch
- **Missing middleware** → Check imports
- **DB connection required** → Make routes handle DB errors gracefully

---

## 📋 COMMON FIXES

### Fix 1: Missing node_modules
```bash
cd /home/zgzqzmyr/newbackend/backend
npm install --production
```

### Fix 2: Prisma Not Generated
```bash
npx prisma generate
```

### Fix 3: File Permissions
```bash
chmod 644 server.js
chmod 755 tmp/
```

### Fix 4: Node Version Check
```bash
/home/zgzqzmyr/nodevenv/newbackend/backend/24/bin/node --version
```

Should match what Prisma was compiled for.

---

## 🎯 NEXT STEPS AFTER ISOLATION

1. ✅ Minimal server works → Add routes incrementally
2. ✅ Routes load → Add DB connection
3. ✅ DB connects → Add Prisma queries
4. ✅ Everything works → Restore full server.js

---

## 📞 REPORT BACK

After running STEP 1, report:
1. What appears in `passenger.log`?
2. What does `curl https://server.rootsmaghreb.com/` return?
3. Any specific error messages?

This will tell us the EXACT failure point.
