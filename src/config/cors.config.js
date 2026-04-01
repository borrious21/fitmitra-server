const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
   "https://fitmitra-fyp.netlify.app",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
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