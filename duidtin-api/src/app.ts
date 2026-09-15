import express from "express";

import { corsMiddleware } from "./middleware/cors.js";
import { penanganError, tidakDitemukan } from "./middleware/error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";

/**
 * Entry yang dideteksi Vercel (export default). Sengaja tidak memanggil listen():
 * di Vercel app ini dibungkus jadi satu function; listener lokal ada di scripts/dev.ts.
 */
const app = express();

app.disable("x-powered-by");
app.use(corsMiddleware);
app.use(express.json({ limit: "100kb" }));

app.use("/health", healthRouter);
app.use("/auth", authRouter);

app.use(tidakDitemukan);
app.use(penanganError);

export default app;
