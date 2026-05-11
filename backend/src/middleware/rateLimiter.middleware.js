import rateLimit from "express-rate-limit";

const windowMs = 15 * 60 * 1000; // 15 minutes

const retryAfterHandler = (req, res) => {
  const retryAfterSecs = Math.ceil(windowMs / 1000);
  res.setHeader("Retry-After", retryAfterSecs);
};

export const generalLimiter = rateLimit({
  windowMs,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later.", retryAfterSeconds: Math.ceil(windowMs / 1000) },
  handler: (req, res, next, options) => {
    retryAfterHandler(req, res);
    res.status(options.statusCode).json(options.message);
  },
});

export const authLimiter = rateLimit({
  windowMs,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again in 15 minutes.", retryAfterSeconds: Math.ceil(windowMs / 1000) },
  handler: (req, res, next, options) => {
    retryAfterHandler(req, res);
    res.status(options.statusCode).json(options.message);
  },
});

export const aiLimiter = rateLimit({
  windowMs,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "AI evaluation rate limit reached. Please wait before submitting more evaluations.", retryAfterSeconds: Math.ceil(windowMs / 1000) },
  handler: (req, res, next, options) => {
    retryAfterHandler(req, res);
    res.status(options.statusCode).json(options.message);
  },
});
