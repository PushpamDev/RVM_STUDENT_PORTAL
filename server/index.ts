import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
// FIX 1: Import handleAnnouncements from the same file
import { handleBatches, handleAnnouncements } from "./routes/batches";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // --- Batches Routes ---
  // Matches the new proxy endpoint name
  app.get("/api/batches", handleBatches);
  // FIX 2: Add legacy alias because your frontend likely still calls "/api/view-batch"
  app.get("/api/view-batch", handleBatches);

  // --- Announcements Route ---
  // FIX 3: Register the announcements route
  app.get("/api/announcements", handleAnnouncements);

  return app;
}