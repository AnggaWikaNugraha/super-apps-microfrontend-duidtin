import type { RequestHandler } from "express";

import { hubungkanDatabase } from "../db/koneksi.js";

/** Dipasang per route yang butuh database, SETELAH validasi dan cek token. */
export const pastikanDatabase: RequestHandler = async (_req, _res, next) => {
  await hubungkanDatabase();
  next();
};
