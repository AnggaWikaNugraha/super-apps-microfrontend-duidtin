import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import RemoteErrorBoundary from "@/components/ui/RemoteErrorBoundary";

import { useModuleLoading } from "./hooks/useModuleLoading";

import type { ReactNode } from "react";

const FEDERATION_MAX_WAIT_MS = 5000;
const FEDERATION_POLL_INTERVAL_MS = 200;

/**
 * Nunggu FASE 1 selesai. Perlu polling, bukan await langsung, karena
 * federationInit() dipanggil di top-level module `_app.tsx` — di luar React,
 * jadi komponen nggak punya pegangan ke promise-nya.
 */
export const waitForFederation = async (
  maxWaitMs = FEDERATION_MAX_WAIT_MS,
  intervalMs = FEDERATION_POLL_INTERVAL_MS,
): Promise<boolean> => {
  const startedAt = Date.now();

  while (!globalThis.window?.__FEDERATION_LOADED) {
    if (Date.now() - startedAt > maxWaitMs) return false;

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return true;
};

interface ModuleFederationProviderProps {
  children?: ReactNode;
}

/**
 * FASE 2 — pemicu warm-up per route.
 *
 * Sekali lagi: provider ini TIDAK me-render satupun komponen remote. Yang naruh
 * komponen ke layar adalah file page di `pages/` (FASE 3). Provider cuma
 * (a) manasin container remote yang bakal kepakai, dan (b) masang error boundary
 * di sekeliling seluruh isi app.
 */
const ModuleFederationProvider = ({ children }: ModuleFederationProviderProps) => {
  const router = useRouter();
  const { loadModulesByRoute } = useModuleLoading();
  const [loadedForPath, setLoadedForPath] = useState<string | null>(null);

  useEffect(() => {
    // Route-nya sama dengan yang barusan diproses → nggak usah diulang.
    if (loadedForPath === router.pathname) return;

    let isStale = false;

    void (async () => {
      const isReady = await waitForFederation();

      // Keburu pindah route lagi selama nunggu — hasil polling ini sudah basi.
      if (isStale) return;

      if (!isReady) {
        console.error("[MFE] Federation nggak siap dalam 5 detik, warm-up dilewati");

        return;
      }

      loadModulesByRoute(router.pathname);
      setLoadedForPath(router.pathname);
    })();

    return () => {
      isStale = true;
    };
  }, [loadModulesByRoute, loadedForPath, router.pathname]);

  return <RemoteErrorBoundary>{children}</RemoteErrorBoundary>;
};

export default ModuleFederationProvider;
