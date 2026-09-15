import { loadRemote } from "@module-federation/runtime";
import dynamic from "next/dynamic";

import type { ComponentType, ReactNode } from "react";

/**
 * Jembatan ke remote INFRASTRUKTUR — sekarang cuma `duidtin_ui_layout`, karena
 * layout dipakai lintas halaman lewat pola `getLayout`.
 *
 * REMOTE FITUR (`duidtin_feature_*`) SENGAJA NGGAK DI SINI. Tiap fitur cuma
 * dipakai satu halaman, jadi `loadRemote`-nya ditulis langsung di file page-nya
 * (lihat `pages/index.tsx`). Kalau dicampur, berkas ini bakal terus membengkak
 * tiap nambah fitur dan susah dibaca.
 *
 * Catatan: host TIDAK lagi mengonsumsi `duidtin_ui_design_system` langsung.
 * Sejak konten `/` pindah ke `duidtin_feature_beranda`, host nggak merender
 * komponen UI sendiri sama sekali — memang itu tujuan shell yang tipis.
 * Design-system sekarang dikonsumsi dari dua tempat lain: layout (buat Badge &
 * Button di header) dan tiap feature remote.
 *
 * `ssr: false` wajib: modulnya di-fetch runtime dari origin lain, jadi nggak ada
 * wujudnya waktu Next prerender di server.
 *
 * `pick` dipertahankan walau belum kepakai — dibutuhkan begitu host perlu
 * compound component (mis. `Card.Header`), karena properti statis nggak ikut
 * terbawa waktu next/dynamic membungkus modulnya jadi Loadable.
 */
const remoteComponent = <TProps,>(
  path: string,
  pick?: (mod: Record<string, unknown>) => ComponentType<TProps>,
) =>
  dynamic<TProps>(
    () =>
      loadRemote(path).then((mod) => ({
        default: pick
          ? pick(mod as Record<string, unknown>)
          : (mod as { default: ComponentType<TProps> }).default,
      })),
    { ssr: false },
  );

/* ---------------------------------------------------------------------------
 * duidtin_ui_layout — layout bersama, membungkus konten tiap halaman (FASE 3)
 * ------------------------------------------------------------------------- */

export interface NavItem {
  href: string;
  label: string;
}

export interface DefaultLayoutProps {
  activePath?: string;
  children?: ReactNode;
  navItems?: NavItem[];
  onLogout?: () => void;
  userName?: string;
}

export const DefaultLayout = remoteComponent<DefaultLayoutProps>("duidtin_ui_layout/default");
