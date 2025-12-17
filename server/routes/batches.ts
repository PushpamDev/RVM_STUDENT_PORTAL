import type { RequestHandler } from "express";

const BASE_URL = "https://prod-ready-backend-fbd-1.onrender.com/api";

// --- 1. HANDLE BATCHES ---
export const handleBatches: RequestHandler = async (req, res) => {
  const UPSTREAM = `${BASE_URL}/batches`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    // 1. Extract Auth Token
    const authHeader =
      req.headers.authorization ||
      req.headers.Authorization ||
      req.headers["x-auth-token"] ||
      req.headers["x-access-token"];
    
    const bearerFromHeader =
      authHeader && String(authHeader).startsWith("Bearer ")
        ? String(authHeader).slice(7)
        : authHeader
          ? String(authHeader)
          : undefined;
    
    const token = bearerFromHeader || process.env.BATCHES_JWT;

    // 2. Prepare Headers
    const headers: Record<string, string> = { accept: "application/json" };

    // FIX: Forward the 'x-location' header
    const location = req.headers["x-location"] || req.headers["location"];
    if (location) {
        headers["x-location"] = String(location);
    } else {
        headers["x-location"] = "Faridabad"; 
    }

    // FIX: Construct URL to forward Query Params (like ?facultyId=...)
    let urlObj = new URL(UPSTREAM);
    Object.keys(req.query).forEach((key) => {
      urlObj.searchParams.append(key, String(req.query[key]));
    });

    if (token) {
      const bearer = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      const raw = token.replace(/^Bearer\s+/i, "");
      
      headers["authorization"] = bearer;
      headers["x-access-token"] = raw;
      
      // Fallback for backends expecting ?token=
      urlObj.searchParams.set("token", raw);
      if (location) urlObj.searchParams.set("location", String(location)); 
    }

    // 3. Fetch from Upstream
    const upstream = await fetch(urlObj.toString(), {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // 4. Handle Errors
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error("Upstream Error:", upstream.status, text);
      return res
        .status(upstream.status)
        .json({ error: `Upstream error ${upstream.status}`, body: text });
    }

    // 5. Process Data & Formatting
    const data = await upstream.json();
    if (Array.isArray(data)) {
      const modifiedData = data.map((batch) => {
        const newBatch = { ...batch };
        // Date Formatting
        if (batch.start_date && batch.end_date) {
          try {
            const startDate = new Date(batch.start_date).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric", year: "numeric" },
            );
            const endDate = new Date(batch.end_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            newBatch.period = `${startDate} to ${endDate}`;
          } catch (e) {}
        }
        // Time Formatting
        if (batch.start_time && batch.end_time) {
          newBatch.timings = `${batch.start_time} - ${batch.end_time}`;
        }
        return newBatch;
      });
      
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      return res.json(modifiedData);
    }

    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.json(data);

  } catch (err: any) {
    const message =
      err?.name === "AbortError"
        ? "Upstream timeout"
        : err?.message || "Unknown error";
    return res.status(502).json({ error: message });
  }
};

// --- 2. HANDLE ANNOUNCEMENTS ---
export const handleAnnouncements: RequestHandler = async (req, res) => {
  const UPSTREAM = `${BASE_URL}/announcements`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); 

    const headers: Record<string, string> = { accept: "application/json" };
    
    // Forward Location
    const location = req.headers["x-location"] || req.headers["location"];
    if (location) {
        headers["x-location"] = String(location);
    } else {
        headers["x-location"] = "Faridabad";
    }

    const upstream = await fetch(UPSTREAM, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
       // Silent fail for announcements usually better than breaking whole page, or return error
       return res.status(upstream.status).json({ error: "Upstream error fetching announcements" });
    }

    const data = await upstream.json();
    
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({ error: err.message });
  }
};