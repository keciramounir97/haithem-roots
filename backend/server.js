const express = require("express");
const path = require("path");

const app = express();
// Default to 5000 for local dev (frontend expects this), but Passenger will override with env PORT
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "production";

console.log("=== PASSENGER BOOT START ===");
console.log("Node version:", process.version);
console.log("Working directory:", __dirname);
console.log("PORT:", PORT);
console.log("NODE_ENV:", NODE_ENV);
console.log("Timestamp:", new Date().toISOString());

// ============================================================
// MIDDLEWARE - Body Parsing
// ============================================================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ============================================================
// SECURITY HEADERS - Applied to ALL responses (Passenger-safe)
// ============================================================
// CRITICAL: This MUST be first middleware - sets headers for root route
// This ensures X-Content-Type-Options is ALWAYS present (fixes webhint warning)
app.use((req, res, next) => {
  // REQUIRED: X-Content-Type-Options - prevents MIME type sniffing
  // This header MUST be set on ALL responses (fixes webhint warning)
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Additional security headers
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Ensure Content-Type is set appropriately (don't override if already set)
  if (!res.getHeader("Content-Type")) {
    // Will be set by res.type() or res.json() in routes
    // For plain text, routes will call res.type("text/plain")
  }
  
  next();
});

// ============================================================
// COMPREHENSIVE CORS - Allow ALL origins (as requested)
// ============================================================
app.use((req, res, next) => {
  // Get origin from request (if present)
  const origin = req.headers.origin;
  
  // Allow ALL origins - echo the origin back if provided (supports credentials)
  // This approach allows any origin while maintaining credentials support
  if (origin) {
    // Echo origin back - allows credentials and works for all origins
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    // No origin header - allow all with wildcard (for non-browser requests)
    res.setHeader("Access-Control-Allow-Origin", "*");
    // Note: Can't use credentials with wildcard, but this handles non-browser requests
  }
  
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma,X-CSRF-Token,X-Request-ID"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length,Content-Type,Date,ETag,Last-Modified,Authorization,X-Request-ID"
  );
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
  
  // Handle preflight OPTIONS requests immediately
  if (req.method === "OPTIONS") {
    // Handle OPTIONS preflight - respond with appropriate CORS headers
    const requestedHeaders = req.headers["access-control-request-headers"];
    const requestedMethod = req.headers["access-control-request-method"];
    
    // Echo back requested headers/methods if provided, otherwise use defaults
    if (requestedHeaders) {
      res.setHeader("Access-Control-Allow-Headers", requestedHeaders);
    }
    if (requestedMethod) {
      res.setHeader("Access-Control-Allow-Methods", requestedMethod);
    }
    
    // Ensure origin is set for OPTIONS response
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    
    return res.status(204).end();
  }
  
  next();
});

// ============================================================
// STATIC FILES - Frontend serving with comprehensive headers
// ============================================================
const distPath = path.join(__dirname, "dist");
app.use(
  express.static(distPath, {
    maxAge: NODE_ENV === "production" ? "1d" : "0",
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Security headers for static files
      res.setHeader("X-Content-Type-Options", "nosniff");
      
      // Cache control for static assets
      if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader("Cache-Control", NODE_ENV === "production" ? "public, max-age=86400" : "no-cache");
      }
    },
  })
);

// ============================================================
// HEALTH CHECK - DevOps friendly endpoint
// ============================================================
app.get("/health", (req, res) => {
  const healthInfo = {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    nodeVersion: process.version,
    memory: {
      used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
    },
  };
  
  res.status(200).json(healthInfo);
});

// Health check for Passenger/Apache monitoring (lightweight)
app.get("/health/liveness", (req, res) => {
  res.status(200).json({ status: "alive" });
});

// Variable to track routes loading (declared before use)
let routesLoaded = false;

app.get("/health/readiness", (req, res) => {
  res.status(200).json({ status: "ready", routesLoaded });
});

// ============================================================
// ROOT ENDPOINT - CRITICAL FOR PASSENGER (MUST NEVER FAIL)
// ============================================================
// This route is hit IMMEDIATELY by Passenger - must be bulletproof
// NO database calls, NO Prisma, NO heavy imports, NO async operations
app.get("/", (req, res) => {
  res
    .status(200)
    .type("text/plain")
    .send("OK");
});

// API info route (separate from root for safety)
app.get("/api/info", (req, res) => {
  res.status(200).json({
    message: "Roots Maghreb API",
    status: "online",
    environment: NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
    timestamp: new Date().toISOString(),
    cors: "enabled (all origins)",
  });
});

// ============================================================
// API ROUTES - Load safely with error handling
// ============================================================
// routesLoaded is already declared above
try {
  // Authentication routes
  app.use("/api/auth", require("./src/routes/authRoutes"));
  
  // Core API routes
  app.use("/api", require("./src/routes/userRoutes"));
  app.use("/api", require("./src/routes/settingsRoutes"));
  app.use("/api", require("./src/routes/statsRoutes"));
  app.use("/api", require("./src/routes/activityRoutes"));
  app.use("/api", require("./src/routes/bookRoutes"));
  app.use("/api", require("./src/routes/treeRoutes"));
  app.use("/api", require("./src/routes/personRoutes"));
  app.use("/api", require("./src/routes/searchRoutes"));
  app.use("/api", require("./src/routes/contactRoutes"));
  app.use("/api", require("./src/routes/healthRoutes"));
  app.use("/api", require("./src/routes/roleRoutes"));
  app.use("/api", require("./src/routes/galleryRoutes"));
  app.use("/api", require("./src/routes/newsletterRoutes"));
  app.use("/api", require("./src/routes/diagnosticsRoutes"));
  
  routesLoaded = true;
  console.log("✅ All routes loaded successfully");
  console.log("📋 Loaded routes: auth, user, settings, stats, activity, book, tree, person, search, contact, health, role, gallery, newsletter, diagnostics");
} catch (err) {
  console.error("❌ Routes loading failed:", err.message);
  console.error("Stack:", err.stack);
  app.use("/api/*", (req, res) => {
    res.status(503).json({ 
      error: "API temporarily unavailable",
      message: "Routes failed to load",
      timestamp: new Date().toISOString()
    });
  });
}

// ============================================================
// 404 HANDLER - Not found or SPA fallback
// ============================================================
app.use((req, res, next) => {
  // For API routes that don't exist, return 404 JSON
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ 
      error: "Not Found",
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
  
  // For non-API GET requests without file extensions, try SPA fallback
  if (req.method === "GET" && !req.path.match(/\.[a-zA-Z0-9]+$/)) {
    const indexPath = path.join(distPath, "index.html");
    try {
      return res.sendFile(indexPath, (err) => {
        if (err) {
          // File doesn't exist, return 404
          res.status(404).json({ 
            error: "Not Found",
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
          });
        }
      });
    } catch (err) {
      // Error serving file, return 404
      return res.status(404).json({ 
        error: "Not Found",
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // For other routes, return 404
  res.status(404).json({ 
    error: "Not Found",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// ERROR HANDLER - Comprehensive error handling
// ============================================================
app.use((err, req, res, next) => {
  // Log error details (helpful for DevOps)
  console.error("Error occurred:", {
    message: err.message,
    stack: NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
  
  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Send error response
  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : err.message,
    statusCode: statusCode,
    timestamp: new Date().toISOString(),
    ...(NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ============================================================
// SERVER STARTUP - Apache/Passenger friendly
// ============================================================
if (!module.parent) {
  // Local development mode - start Express server directly
  // CRITICAL: Bind to 0.0.0.0 not localhost for Passenger compatibility
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Environment: ${NODE_ENV}`);
    console.log(`🌐 CORS: Enabled (all origins)`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
  });
} else {
  // Passenger mode - Apache/Passenger will handle the server
  console.log("✅ Passenger mode detected - ready for Apache/Passenger");
  console.log("📡 Server will be managed by Passenger");
}

// Export for Passenger (REQUIRED for Passenger integration)
// Passenger expects this export to be the Express app
module.exports = app;

console.log("=== PASSENGER BOOT COMPLETE ===");
console.log(`✅ Server configured for: ${NODE_ENV === "production" ? "Production" : "Development"}`);
console.log("✅ CORS enabled for all origins");
console.log("✅ Security headers configured");
console.log("✅ Ready to handle requests");
