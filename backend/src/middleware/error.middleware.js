export const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err.message);

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: "Validation error", errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ message: `Duplicate value for ${field}` });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  const statusCode = err.statusCode || 500;
  if (err.retryAfterSeconds) res.setHeader("Retry-After", err.retryAfterSeconds);
  res.status(statusCode).json({
    message: err.message || "Internal server error",
    ...(err.retryAfterSeconds && { retryAfterSeconds: err.retryAfterSeconds }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
