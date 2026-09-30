import { QueryCache, QueryClient } from "@tanstack/vue-query";

import { storeErrorGlobal } from "@/stores/error-global";
import { ApiError } from "./api/client";

/**
 * QueryClient MILIK REPO INI SENDIRI, bukan dibagi dari host.
 *
 * Konsekuensinya cache nggak dibagi antar feature remote — kalau nanti dua
 * fitur mengambil data yang sama, dua-duanya fetch sendiri. Ditukar dengan
 * kemandirian: host nggak perlu tahu apa-apa soal TanStack Query, dan repo ini
 * bisa ganti versi tanpa mengganggu siapa pun.
 *
 * Di sini pertukaran itu bahkan tidak punya pilihan lain: host memakai
 * `@tanstack/react-query`, repo ini `@tanstack/vue-query`. Dua paket berbeda,
 * jadi share scope pun tidak bisa menyatukannya.
 */
export const buatQueryClient = () =>
  new QueryClient({
    /**
     * ERROR GLOBAL SAAT API HIT.
     *
     * Ini jaring pengaman lapis kedua: tiap blok sudah menampilkan error-nya
     * sendiri lewat `<dtn-data-state>`, tapi `onError` di sini menangkap SEMUA
     * query yang gagal di satu tempat — buat logging terpusat dan banner global.
     */
    queryCache: new QueryCache({
      onError: (error, query) => {
        const endpoint = error instanceof ApiError ? error.endpoint : String(query.queryKey);

        console.error(`[beranda] query gagal: ${endpoint}`, error);

        // getState() — dipanggil dari luar komponen, jadi tidak bisa pakai
        // composable. Ini salah satu keuntungan store: yang bukan komponen pun
        // bisa menulis.
        storeErrorGlobal.getState().setPesan(
          error instanceof ApiError
            ? `Sebagian data gagal dimuat (${error.endpoint}). Menampilkan data seadanya.`
            : "Sebagian data gagal dimuat. Menampilkan data seadanya.",
        );
      },
    }),
    defaultOptions: {
      queries: {
        // 1x saja — bawaan TanStack 3x dengan backoff, kelamaan buat lihat error
        retry: 1,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });
