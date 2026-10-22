/**
 * Entry halaman dev (:3005) — BUKAN jalur yang dipakai host.
 *
 * Dynamic import = batas asinkron yang diminta Module Federation, supaya modul
 * bersama selesai disiapkan sebelum ada kode yang memakainya.
 */
void import("./dev-app");
