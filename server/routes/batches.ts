import type { RequestHandler } from "express";

// IMPORTANT:
// This runs in Node (NOT Vite).
// Use environment variable or fallback to local scheduler container.
const BASE_URL =
  process.env.SCHEDULER_API_URL || "http://localhost:3000/api";

// ======================================================
// 1. HANDLE BATCHES
// ======================================================
export const handleBatches: RequestHandler = async (req, res) => {
  const UPSTREAM = `${BASE_URL}/batches`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    // --- Extract Auth Token ---
    const authHeader =
      req.headers.authorization ||
      req.headers["Authorization"] ||
      req.headers["x-auth-token"] ||
      req.headers["x-access-token"];

    const bearerFromHeader =
      authHeader && String(authHeader).startsWith("Bearer ")
        ? String(authHeader).slice(7)
        : authHeader
        ? String(authHeader)
        : undefined;

    const token = bearerFromHeader || process.env.BATCHES_JWT;

    // --- Prepare Headers ---
    const headers: Record<string, string> = {
      accept: "application/json",
    };

    const location =
      req.headers["x-location"] ||
      req.headers["location"] ||
      "Faridabad";

    headers["x-location"] = String(location);

    // --- Forward Query Params ---
    const urlObj = new URL(UPSTREAM);
    Object.keys(req.query).forEach((key) => {
      urlObj.searchParams.append(key, String(req.query[key]));
    });

    if (token) {
      const bearer = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;

      const raw = token.replace(/^Bearer\s+/i, "");

      headers["authorization"] = bearer;
      headers["x-access-token"] = raw;

      // Optional fallback
      urlObj.searchParams.set("token", raw);
      urlObj.searchParams.set("location", String(location));
    }

    // --- Fetch ---
    const upstream = await fetch(urlObj.toString(), {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error("Upstream Error:", upstream.status, text);

      return res.status(upstream.status).json({
        error: `Upstream error ${upstream.status}`,
        body: text,
      });
    }

    const data = await upstream.json();

    // --- Formatting ---
    if (Array.isArray(data)) {
      const modified = data.map((batch) => {
        const newBatch = { ...batch };

        if (batch.start_date && batch.end_date) {
          try {
            const start = new Date(batch.start_date).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric", year: "numeric" }
            );

            const end = new Date(batch.end_date).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric", year: "numeric" }
            );

            newBatch.period = `${start} to ${end}`;
          } catch {}
        }

        if (batch.start_time && batch.end_time) {
          newBatch.timings = `${batch.start_time} - ${batch.end_time}`;
        }

        return newBatch;
      });

      res.setHeader(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );

      return res.json(modified);
    }

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );

    return res.json(data);
  } catch (err: any) {
    const message =
      err?.name === "AbortError"
        ? "Upstream timeout"
        : err?.message || "Unknown error";

    return res.status(502).json({ error: message });
  }
};

// ======================================================
// 2. HANDLE ANNOUNCEMENTS
// ======================================================
export const handleAnnouncements: RequestHandler = async (req, res) => {
  const UPSTREAM = `${BASE_URL}/announcements`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const headers: Record<string, string> = {
      accept: "application/json",
    };

    const location =
      req.headers["x-location"] ||
      req.headers["location"] ||
      "Faridabad";

    headers["x-location"] = String(location);

    const upstream = await fetch(UPSTREAM, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .json({ error: "Upstream error fetching announcements" });
    }

    const data = await upstream.json();

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );

    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({ error: err.message });
  }
};
