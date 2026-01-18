/**
 * Full API smoke harness.
 * - Target base URL: API_BASE (default http://localhost:5000/api)
 * - For admin routes, provide ADMIN_TOKEN or ADMIN_EMAIL/ADMIN_PASSWORD (seed admin) to login.
 * - Creates a temp user for signup/login/reset flows to avoid touching real data.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const axiosBase = require("axios");
const crypto = require("crypto");

const BASE = (process.env.API_BASE || "http://localhost:5000/api").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const api = axiosBase.create({
  baseURL: BASE,
  timeout: 8000,
  validateStatus: () => true,
});

async function login(email, password) {
  const res = await api.post("/auth/login", { email, password });
  return res.status < 400 ? res.data.token : null;
}

async function smokeAuth() {
  const email = `smoke_${crypto.randomUUID().slice(0, 8)}@example.com`;
  const password = "SmokePass123!";
  const results = [];
  let resetCode = null;

  // Signup
  const signupRes = await api.post("/auth/signup", {
    fullName: "Smoke Test",
    phone: "+10000000000",
    email,
    password,
  });
  results.push({ name: "auth.signup", status: signupRes.status, ok: signupRes.status < 400 });

  // Login
  const loginRes = await api.post("/auth/login", { email, password });
  const token = loginRes.data?.token;
  results.push({ name: "auth.login", status: loginRes.status, ok: !!token });

  // Me
  const meRes = await api.get("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  results.push({ name: "auth.me", status: meRes.status, ok: meRes.status < 400 });

  // Reset request
  const resetReq = await api.post(
    "/auth/reset",
    { email },
    { headers: { "x-echo-reset-code": "true" } }
  );
  results.push({ name: "auth.reset.request", status: resetReq.status, ok: resetReq.status < 400 });
  if (resetReq.data && resetReq.data.code) {
    resetCode = resetReq.data.code;
  }

  if (resetCode) {
    const resetVerify = await api.post("/auth/reset/verify", {
      email,
      code: resetCode,
      newPassword: "SmokePass456!",
    });
    results.push({
      name: "auth.reset.verify",
      status: resetVerify.status,
      ok: resetVerify.status < 400,
    });
  } else {
    results.push({
      name: "auth.reset.verify",
      status: "SKIP",
      ok: false,
      message: "Code email not captured in smoke",
    });
  }

  return results;
}

async function smokePublic() {
  const resHealth = await api.get("/health");
  const resBooks = await api.get("/books");
  const resTrees = await api.get("/trees");
  const resSearch = await api.get("/search?q=a");
  return [
    { name: "health", status: resHealth.status, ok: resHealth.status < 400 },
    { name: "books.public", status: resBooks.status, ok: resBooks.status < 400 },
    { name: "trees.public", status: resTrees.status, ok: resTrees.status < 400 },
    { name: "search", status: resSearch.status, ok: resSearch.status < 400 },
  ];
}

async function smokeAdmin() {
  const results = [];
  let adminToken = ADMIN_TOKEN;
  const adminEmail = ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL;
  const adminPassword = ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD;

  if (!adminToken && adminEmail && adminPassword) {
    adminToken = await login(adminEmail, adminPassword);
  }
  if (!adminToken) {
    return [
      {
        name: "admin",
        status: "SKIP",
        ok: false,
        message: "Missing ADMIN_TOKEN or ADMIN_EMAIL/ADMIN_PASSWORD",
      },
    ];
  }

  const authHeader = { Authorization: `Bearer ${adminToken}` };
  const adminRequests = [
    { name: "admin.users", method: "get", url: "/admin/users" },
    { name: "admin.roles", method: "get", url: "/admin/roles" },
    { name: "admin.stats", method: "get", url: "/admin/stats" },
    { name: "admin.activity", method: "get", url: "/admin/activity" },
    { name: "admin.books", method: "get", url: "/admin/books" },
    { name: "admin.trees", method: "get", url: "/admin/trees" },
    { name: "admin.settings", method: "get", url: "/admin/settings" },
  ];

  for (const req of adminRequests) {
    const res = await api({
      url: req.url,
      method: req.method,
      headers: authHeader,
    });
    results.push({ name: req.name, status: res.status, ok: res.status < 400 });
  }

  return results;
}

async function main() {
  const results = [
    ...(await smokePublic()),
    ...(await smokeAuth()),
    ...(await smokeAdmin()),
  ];

  console.log("Full smoke results:");
  results.forEach((r) =>
    console.log(
      `${r.ok ? "✅" : "❌"} ${r.name} -> ${r.status}${
        r.message ? ` (${r.message})` : ""
      }`
    )
  );
  const failed = results.filter((r) => !r.ok && r.status !== "SKIP");
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error("Smoke failed:", err.message);
  process.exit(1);
});
