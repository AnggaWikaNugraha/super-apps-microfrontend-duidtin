/**
 * Halaman dev merender beranda YANG SEBENARNYA, bukan halaman penanda.
 *
 * Versi Next-nya cuma bisa memasang halaman guard: provider dan pendaftaran
 * remote-nya ada di modul yang di-expose, jadi `pages/index.tsx` tidak punya
 * apa pun untuk dirender. Di sini `mount()` itu satu fungsi biasa — halaman dev
 * memanggilnya dengan cara yang sama seperti host.
 *
 * Komponen `<dtn-*>`-nya diambil dari design-system di :3001, jadi jalankan
 * `bun run dev:producer` di repo design-system lebih dulu.
 */
import { mount } from "@/expose/base";

import "@/styles/globals.css";

const wadah = document.querySelector<HTMLElement>("#root");

if (wadah) mount(wadah);
