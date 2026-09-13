import { QueryCache, QueryClient } from "@tanstack/react-query";

import { useErrorGlobal } from "@/stores/error-global";
import { ApiError } from "./api/client";

/**
 * QueryClient MILIK REPO INI SENDIRI, bukan dibagi dari host.
 *
 * Konsekuensinya cache nggak dibagi antar feature remote — kalau nanti dua
 * fitur mengambil data yang sama, dua-duanya fetch sendiri. Ditukar dengan
 * kemandirian: host nggak perlu tahu apa-apa soal React Query, dan repo ini
 * bisa ganti versi tanpa mengganggu siapa pun.
 *
 * Kalau nanti cache perlu dibagi, caranya jadikan `@tanstack/react-query`
 * shared singleton di config MF — persis pola React sekarang.
 */
export const buatQueryClient = () =>
  new QueryClient({
    /**
     * ERROR GLOBAL SAAT API HIT.
     *
     * Ini jaring pengaman lapis kedua: tiap blok sudah menampilkan error-nya
     * sendiri lewat `BlockState`, tapi `onError` di sini menangkap SEMUA query
     * yang gagal di satu tempat — buat logging terpusat dan banner global.
     */
    queryCache: new QueryCache({
      onError: (error, query) => {
        const endpoint = error instanceof ApiError ? error.endpoint : String(query.queryKey);

        console.error(`[beranda] query gagal: ${endpoint}`, error);

        // getState() — dipanggil dari luar React, jadi nggak bisa pakai hook.
        // Ini salah satu keuntungan store: yang bukan komponen pun bisa menulis.
        useErrorGlobal.getState().setPesan(
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
