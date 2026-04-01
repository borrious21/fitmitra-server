export default function errorMiddleware(err, req, res, next) {
  console.error("ERROR:", err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Something went wrong on the server",
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });
}
