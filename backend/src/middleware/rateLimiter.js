const requests = new Map();

const rateLimiter = (
  maxRequests = 60,
  windowMs = 60 * 1000
) => {
  return (req, res, next) => {
    const key =
      req.ip || "unknown";

    const now = Date.now();

    const record =
      requests.get(key);

    if (
      !record ||
      now - record.start > windowMs
    ) {
      requests.set(key, {
        count: 1,
        start: now,
      });

      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message:
          "Too many requests. Please try again later.",
      });
    }

    next();
  };
};

module.exports = rateLimiter;