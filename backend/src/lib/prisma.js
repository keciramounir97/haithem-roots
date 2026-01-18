// ============================================================
// LAZY-LOADED PRISMA CLIENT - Prevents DB connection at startup
// ============================================================
// CRITICAL: Prisma client is NOT created at module load time
// It's only created when first accessed (lazy initialization)
// This allows server.js to start without requiring DB connection

const { PrismaClient } = require("@prisma/client");
const { DB_NAME } = require("../config/env");
const {
  isDbUnavailable,
  markDbDown,
  clearDbDown,
} = require("../utils/dbState");

// LAZY INITIALIZATION - Prisma client created only when needed
let _prismaInstance = null;

const shouldBackoff = (err) => {
  const code = err?.code;
  if (["P1000", "P1001", "P1002", "P1003", "P2024"].includes(code)) {
    return true;
  }
  const msg = String(err?.message || "");
  return (
    msg.includes("Can't reach database server") ||
    msg.includes("Timed out fetching a new connection") ||
    msg.includes("connect ECONNREFUSED") ||
    msg.includes("connection pool")
  );
};

const backoffForError = (err) => {
  if (err?.code === "P2024") {
    return Number(process.env.DB_POOL_BACKOFF_MS || 3000) || 3000;
  }
  return null;
};

// Get Prisma client - lazy initialization (only created on first access)
const getPrisma = () => {
  if (!_prismaInstance) {
    // Create Prisma client ONLY when first accessed
    _prismaInstance = new PrismaClient({
      log: process.env.DEBUG_PRISMA ? ["query", "warn", "error"] : ["error"],
    });

    // Set up middleware for connection handling
    _prismaInstance.$use(async (params, next) => {
      if (isDbUnavailable()) {
        const err = new Error("Database unavailable.");
        err.code = "P1001";
        throw err;
      }

      try {
        const result = await next(params);
        clearDbDown();
        return result;
      } catch (err) {
        if (shouldBackoff(err)) {
          markDbDown(err, backoffForError(err));
        }
        throw err;
      }
    });
  }
  return _prismaInstance;
};

// Export getter function instead of instance
// Routes will access via prisma.user.findMany() etc. - works transparently
const prisma = new Proxy({}, {
  get(target, prop) {
    const instance = getPrisma();
    return instance[prop];
  }
});

module.exports = { prisma, DB_NAME };
