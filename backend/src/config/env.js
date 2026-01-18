const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const buildDatabaseUrl = () => {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || 3306;
  const name = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASSWORD;
  if (!host || !name || !user || pass === undefined) return null;
  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(pass);
  return `mysql://${encodedUser}:${encodedPass}@${host}:${port}/${name}`;
};

// Force DATABASE_URL to align with DB_* if provided
(() => {
  const url = buildDatabaseUrl();
  if (url) {
    process.env.DATABASE_URL = url;
  }
})();

const RAW_ALLOWED = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "https://rootsmaghreb.com",
      "https://www.rootsmaghreb.com",
      "http://192.168.56.1:5173",
      "http://192.168.100.3:5173",
    ];

const allowedOrigins = RAW_ALLOWED.map((o) => o.trim().replace(/\/$/, ""));

const parseDbName = () => {
  if (process.env.DB_NAME) return process.env.DB_NAME;
  try {
    const parsed = new URL(process.env.DATABASE_URL || "");
    return parsed.pathname.replace(/^\//, "") || null;
  } catch {
    return null;
  }
};

const DB_NAME = parseDbName();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET in backend/.env");
  process.exit(1);
}

module.exports = {
  allowedOrigins,
  DB_NAME,
  JWT_SECRET,
  PORT: Number(process.env.PORT) || 5000,
  SESSION_TTL_SECONDS:
    Number(process.env.SESSION_TTL_SECONDS) ||
    Number(process.env.JWT_EXPIRES_IN) ||
    60 * 60 * 24 * 30,
  RESET_TTL_SECONDS: Number(process.env.RESET_CODE_TTL) || 900,
};
