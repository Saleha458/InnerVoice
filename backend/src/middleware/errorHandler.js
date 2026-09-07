const errorHandler = (
  err,
  req,
  res,
  next
) => {
  console.error(
    "Unhandled API Error:",
    err
  );

  const statusCode =
    err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message:
      err.message ||
      "Internal server error",
  });
};

module.exports = errorHandler;