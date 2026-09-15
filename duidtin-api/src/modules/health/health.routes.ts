import { Router } from "express";

import { databaseTerhubung, hubungkanDatabase } from "../../db/koneksi.js";
import { kirim } from "../../lib/respons.js";

export interface HealthData {
  app: "ok";
  db: "terhubung" | "terputus";
}

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  try {
    await hubungkanDatabase();
  } catch {
    // tidak dilempar: kegagalan database justru yang dilaporkan endpoint ini
  }

  const data: HealthData = { app: "ok", db: databaseTerhubung() ? "terhubung" : "terputus" };

  if (data.db === "terhubung") {
    kirim(res, 200, "Layanan berjalan normal.", data);
  } else {
    kirim(res, 503, "Database tidak terhubung.", data);
  }
});
