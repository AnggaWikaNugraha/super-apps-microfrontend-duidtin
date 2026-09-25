import dynamic from "next/dynamic";

/**
 * BEDA dari `duidtin-feature-beranda`, yang halaman langsungnya cuma penanda.
 *
 * Login harus bisa dicoba tanpa menyalakan host: `@duidtin/auth` membuat store
 * cadangan sendiri kalau `window.__DUIDTIN_AUTH__` belum ada, jadi form ini
 * benar-benar berfungsi di `http://localhost:3004/auth` — sesinya tersimpan di
 * localStorage origin ini.
 *
 * WAJIB `dynamic`, bukan import biasa. Halaman Next adalah modul sinkron;
 * kalau container-nya di-import langsung, komponen design-system memanggil
 * `loadShareSync("react")` sebelum share scope terisi dan gagal dengan
 * "loadShareSync failed … you can check whether an async boundary is
 * implemented". `dynamic()` inilah async boundary-nya. Saat dirender host
 * masalah ini tidak muncul, karena host memuat `./login` secara async.
 *
 * `onSuccess` sengaja tidak diisi: pengalihan halaman tugas host.
 */
const LoginContainer = dynamic(() => import("@/containers/login"), { ssr: false });

const LoginPage = () => <LoginContainer />;

export default LoginPage;
