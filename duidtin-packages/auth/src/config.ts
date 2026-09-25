/**
 * Base URL `duidtin-api`, diisi tiap app saat boot.
 *
 * Paket ini sengaja TIDAK membaca env sendiri: namanya berbeda tiap bundler
 * (`process.env.NEXT_PUBLIC_*` di Next, `import.meta.env.VITE_*` di Vite), dan
 * membacanya di sini membuat paket cuma bisa dipakai satu jenis app.
 */
let baseUrl = "http://localhost:4000";

export const configureAuth = (options: { baseUrl: string }): void => {
  baseUrl = options.baseUrl.replace(/\/+$/, "");
};

export const getBaseUrl = (): string => baseUrl;
