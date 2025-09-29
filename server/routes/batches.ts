import type { RequestHandler } from "express";

const UPSTREAM = "https://prod-ready-backend-fbd-1.onrender.com/api/view-batch";

export const handleBatches: RequestHandler = async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

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

    const headers: Record<string, string> = { accept: "application/json" };
    let url = UPSTREAM;
    if (token) {
      const bearer = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      const raw = token.replace(/^Bearer\s+/i, "");
      headers["authorization"] = bearer;
      headers["Authorization"] = bearer;
      headers["x-access-token"] = raw;
      headers["x-auth-token"] = raw;
      headers["auth-token"] = raw;
      headers["jwt"] = raw;
      headers["token"] = raw;
      // Fallback: add query token for backends expecting ?token=
      try {
        const u = new URL(UPSTREAM);
        u.searchParams.set("token", raw);
        url = u.toString();
      } catch {}
    }

    const upstream = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return res
        .status(upstream.status)
        .json({ error: `Upstream error ${upstream.status}`, body: text });
    }
    const data = await upstream.json();
    if (Array.isArray(data)) {
      const modifiedData = data.map((batch) => {
        const newBatch = { ...batch };
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
          } catch (e) {
            // ignore date parsing errors
          }
        }
        if (batch.start_time && batch.end_time) {
          newBatch.timings = `${batch.start_time} - ${batch.end_time}`;
        }
        return newBatch;
      });
      res.setHeader(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300",
      );
      return res.json(modifiedData);
    }
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
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