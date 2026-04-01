// server.js
import dotenv from "dotenv";
dotenv.config();
import app from "./src/app.js";
import pool from "./src/config/db.config.js";
import { port } from "./src/config/env.config.js";

const PORT = port || 5000;
let server;
let isShuttingDown = false;

const startServer = async () => {
  try {
    const client = await pool.connect();
    console.log("Database connected successfully");
    client.release();

    server = app.listen(PORT, () => {
      console.log(
        `Server runs in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
      );
    });
  } catch (error) {
    console.error("Server crashed:", error.message);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n ${signal} received. Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      try {
        await pool.end();
        console.log("Server and database connections closed");
        process.exit(0);
      } catch (err) {
        console.error("Error during shutdown:", err);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  shutdown("unhandledRejection");
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  shutdown("uncaughtException");
});

startServer();
