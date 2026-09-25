import { configureAuth } from "@duidtin/auth";

/**
 * Base URL `duidtin-api` untuk bundle REPO INI.
 *
 * Host memanggil `configureAuth()` juga, tapi nilainya tidak sampai ke sini:
 * `baseUrl` itu variabel modul, dan tiap remote mem-bundle salinan paketnya
 * sendiri. Yang dibagi lintas remote cuma STORE-nya (`window.__DUIDTIN_AUTH__`).
 *
 * Diletakkan di modul, bukan di `pages/_app.tsx`, karena `_app.tsx` tidak
 * dieksekusi saat remote ini dimuat host — sama alasannya dengan federation.ts.
 */
configureAuth({ baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000" });

export {};
