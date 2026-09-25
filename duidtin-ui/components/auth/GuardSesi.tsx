import { useAuth } from "@duidtin/auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { tujuanSetelahLogin } from "@/utils/rute";

import type { ReactNode } from "react";

/** Halaman yang boleh dibuka tanpa sesi. */
const RUTE_PUBLIK = ["/login"];

/**
 * Penjaga sesi untuk SELURUH halaman host (dipasang di `_app.tsx`).
 *
 * Tiga keadaan `status` diperlakukan berbeda, dan urutannya penting:
 *
 *   "loading"          hydrate localStorage belum selesai → JANGAN putuskan apa-apa.
 *                      Kalau di sini langsung redirect, pengguna yang sebenarnya
 *                      masih login ikut terlempar ke /login tiap muat halaman.
 *   "unauthenticated"  halaman privat → /login?dari=<halaman yang dituju>
 *   "authenticated"    sedang di /login → balik ke tujuan semula (atau "/")
 *
 * Pengalihan dilakukan di efek, tapi render-nya ditahan lebih dulu supaya konten
 * halaman privat tidak sempat berkedip sebelum router pindah.
 */
const GuardSesi = ({ children }: { children: ReactNode }) => {
  const { status } = useAuth();
  const router = useRouter();
  const publik = RUTE_PUBLIK.includes(router.pathname);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" && !publik) {
      void router.replace(`/login?dari=${encodeURIComponent(router.asPath)}`);

      return;
    }

    if (status === "authenticated" && publik) {
      void router.replace(tujuanSetelahLogin(router.query.dari));
    }
  }, [publik, router, status]);

  if (status === "loading") return null;
  if (status === "unauthenticated" && !publik) return null;
  if (status === "authenticated" && publik) return null;

  return <>{children}</>;
};

export default GuardSesi;
