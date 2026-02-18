import type { RequestHandler } from "express";

// IMPORTANT:
// Call scheduler internally via Docker network / localhost
// NOT via public HTTPS domain.
const BASE_URL =
  process.env.SCHEDULER_API_URL || "http://localhost:3000/api";

export const handleAnnouncements: RequestHandler = async (req, res) => {
  const UPSTREAM = `${BASE_URL}/announcements`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const location =
      req.headers["x-location"] ||
      req.headers["location"] ||
      "Faridabad";

    const upstream = await fetch(UPSTREAM, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-location": String(location),
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error("Announcements upstream error:", text);

      return res.status(upstream.status).json({
        error: "Upstream error",
        body: text,
      });
    }

    const data = await upstream.json();

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );

    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({
      error: err?.name === "AbortError"
        ? "Upstream timeout"
        : err?.message || "Upstream request failed",
    });
  }
};
