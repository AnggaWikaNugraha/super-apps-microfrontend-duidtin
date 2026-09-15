import request from "supertest";

import app from "../src/app.js";
import { hubungkanDatabase } from "../src/db/koneksi.js";
import { resetWaktu } from "../src/lib/waktu.js";
import { isiDataSeed, kosongkanKoleksiAuth, PASSWORD_DEV } from "../scripts/data-seed.js";

export const api = () => request(app);

/** Database bersih + data seed + waktu normal, dipanggil di beforeEach. */
export const siapkanData = async (): Promise<void> => {
  resetWaktu();
  await hubungkanDatabase();
  await kosongkanKoleksiAuth();
  await isiDataSeed();
};

export const login = (email = "angga@duidtin.test", password = PASSWORD_DEV) =>
  api().post("/auth/login").send({ email, password });

export const MENIT = 60_000;
export const HARI = 24 * 60 * MENIT;
