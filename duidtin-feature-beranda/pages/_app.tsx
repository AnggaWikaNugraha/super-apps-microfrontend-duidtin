import type { AppProps } from "next/app";

/**
 * Sengaja kosong.
 *
 * Pendaftaran remote TIDAK ditaruh di sini — waktu beranda dimuat host, berkas
 * ini nggak pernah dieksekusi (host cuma ambil modul `./base`). Registrasinya
 * ada di `services/federation.ts`, di-import oleh komponen yang memakainya.
 */
const App = ({ Component, pageProps }: AppProps) => <Component {...pageProps} />;

export default App;
