const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      origin.endsWith(".vercel.app") ||
      origin === "https://fitmitra-fyp.netlify.app" ||
      origin === "http://localhost:3000" ||
      origin === "http://localhost:5173"
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

export default corsOptions;