import type { RequestHandler } from "express";

// Point to your actual backend URL
const UPSTREAM = "https://prod-ready-backend-fbd-1.onrender.com/api/announcements";

export const handleAnnouncements: RequestHandler = async (req, res) => {
  try {
    const location = req.headers["x-location"] || req.headers["location"] || "Faridabad";
    
    // Forward the request to the backend with the location header
    const upstream = await fetch(UPSTREAM, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "x-location": String(location)
      }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Upstream error" });
    }

    const data = await upstream.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};