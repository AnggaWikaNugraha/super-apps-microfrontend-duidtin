import cors from "cors";

import { env } from "../config/env.js";

/**
 * Hanya origin di `CORS_ORIGINS` yang diberi header CORS; browser dari origin lain
 * akan menolak membaca respons. Request tanpa `Origin` (curl, server-ke-server)
 * tetap dilayani karena CORS memang aturan browser.
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => callback(null, !origin || env.corsOrigins.includes(origin)),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: false,
  maxAge: 600,
});
