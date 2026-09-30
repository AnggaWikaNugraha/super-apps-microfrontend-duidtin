/**
 * Entry halaman dev (:3003) — BUKAN jalur yang dipakai host.
 *
 * Host mengambil modul `./base` lewat `loadRemote`, jadi berkas ini tidak pernah
 * dieksekusi di sana. Semua yang harus jalan di dua-duanya (pendaftaran remote,
 * provider, dsb) ada di `expose/base.ts`, bukan di sini — pelajaran yang sama
 * dengan versi Next-nya, yang sempat menaruhnya di `pages/_app.tsx`.
 *
 * Dynamic import, bukan import biasa: itu batas asinkron yang diminta Module
 * Federation supaya modul bersama (share scope) selesai disiapkan sebelum ada
 * kode yang memakainya.
 */
void import("./dev-app");
