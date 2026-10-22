import { apiGet } from "./client";

import type { Account, AccountDetail, Activity } from "./types";

/**
 * Kunci query dikumpulkan di satu tempat supaya invalidasi nggak salah ketik.
 *
 * Yang per-rekening memakai `id` sebagai bagian kunci, jadi dua rekening yang
 * berbeda punya cache sendiri-sendiri — pindah dari detail A ke detail B tidak
 * menampilkan data A sekejap.
 */
export const accountKeys = {
  all: ["rekening"] as const,
  list: ["rekening", "daftar"] as const,
  detail: (id: string) => ["rekening", "detail", id] as const,
  activity: (id: string) => ["rekening", "aktivitas", id] as const,
};

export const fetchAccounts = (): Promise<Account[]> => apiGet<Account[]>("daftar", "/rekening");

export const fetchAccountDetail = (id: string): Promise<AccountDetail> =>
  apiGet<AccountDetail>("detail", `/rekening/${id}`);

export const fetchAccountActivity = (id: string): Promise<Activity[]> =>
  apiGet<Activity[]>("aktivitas", `/rekening/${id}/aktivitas`);
