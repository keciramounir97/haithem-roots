const prismaErrorMap = {
  P1000: "Database authentication failed.",
  P1001: "Database unavailable. Please try again later.",
  P1002: "Database connection timed out.",
  P1003: "Database does not exist or is unreachable.",
  P2024: "Database connection pool exhausted. Please retry shortly.",
};

const getDatabaseErrorResponse = (err) => {
  if (!err) return null;
  const code = err.code;
  if (code && prismaErrorMap[code]) {
    return { status: 503, message: prismaErrorMap[code] };
  }
  if (err.name === "PrismaClientInitializationError") {
    return { status: 503, message: prismaErrorMap.P1001 };
  }
  const msg = String(err.message || "");
  if (
    msg.includes("Can't reach database server") ||
    msg.includes("Timed out fetching a new connection") ||
    msg.includes("connection pool")
  ) {
    return { status: 503, message: prismaErrorMap.P1001 };
  }
  return null;
};

module.exports = { getDatabaseErrorResponse };
