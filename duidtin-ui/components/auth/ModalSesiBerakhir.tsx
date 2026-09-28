import { loadRemote } from "@module-federation/runtime";
import dynamic from "next/dynamic";

import type { ComponentType } from "react";

/**
 * Modal "sesi berakhir" dari remote auth.
 *
 * PENGECUALIAN dari aturan "remote fitur di-loadRemote di file page-nya": modal ini
 * bisa muncul di halaman MANA SAJA, jadi tempatnya di sini — sama alasannya dengan
 * layout di `components/remote/`.
 *
 * Dimuat hanya saat dibutuhkan: `GuardSesi` merendernya cuma ketika status sesi
 * "kedaluwarsa", jadi chunk-nya tidak ikut diminta selama sesi masih sehat.
 */
const ModalSesiBerakhir = dynamic<Record<string, never>>(
  () =>
    loadRemote("duidtin_feature_auth/sesi-berakhir").then((mod) => ({
      default: (mod as { default: ComponentType<Record<string, never>> }).default,
    })),
  { ssr: false },
);

export default ModalSesiBerakhir;
