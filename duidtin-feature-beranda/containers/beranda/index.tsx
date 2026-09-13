import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorBoundary } from "@/components/remote/design-system";
import { buatQueryClient } from "@/services/query-client";

import AktivitasTerakhir from "./blocks/aktivitas-terakhir";
import AntreanPersetujuan from "./blocks/antrean-persetujuan";
import Pintasan from "./blocks/pintasan";
import RekeningPerusahaan from "./blocks/rekening-perusahaan";
import RingkasanSaldo from "./blocks/ringkasan-saldo";
import GlobalErrorBanner from "./components/global-error-banner";

/**
 * Isi beranda — di-expose sebagai "./base" dan dirender host di route "/".
 *
 * PROVIDER ADA DI SINI, BUKAN DI `pages/_app.tsx`.
 * Waktu beranda dimuat sebagai remote, host cuma mengambil modul `./base` —
 * `_app.tsx` nggak pernah dieksekusi. Provider apapun yang ditaruh di sana
 * cuma jalan kalau :3003 dibuka langsung. Ini pelajaran mahal: pernah bikin
 * semua komponen design-system hilang tanpa satu pun pesan error.
 *
 * DUA LAPIS PENANGANAN ERROR:
 *   1. ErrorBoundary  — crash saat RENDER. Dipasang per blok, jadi satu blok
 *                       yang crash nggak menjatuhkan blok lain.
 *   2. BlockState     — query GAGAL. Tiap blok punya query sendiri, jadi
 *                       keadaan gagalnya independen.
 * Ditambah GlobalErrorBanner yang menangkap semua kegagalan query di satu
 * tempat lewat QueryCache.onError.
 */
const BerandaContainer = () => {
  // useState, bukan modul-level: tiap mount dapat client sendiri, jadi kalau
  // host melepas dan memasang ulang remote ini, cache lamanya nggak nyangkut.
  const [queryClient] = useState(buatQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="fber-page">
        <div>
          <h1 className="fber-page__title">Beranda</h1>
          <p className="fber-page__lead">Ringkasan kas dan aktivitas perusahaan Anda.</p>
        </div>

        <GlobalErrorBanner />

        <ErrorBoundary title="Ringkasan saldo">
          <RingkasanSaldo />
        </ErrorBoundary>

        <div className="fber-page__grid">
          <ErrorBoundary title="Rekening perusahaan">
            <RekeningPerusahaan />
          </ErrorBoundary>

          <ErrorBoundary title="Antrean persetujuan">
            <AntreanPersetujuan />
          </ErrorBoundary>
        </div>

        <ErrorBoundary title="Aktivitas terakhir">
          <AktivitasTerakhir />
        </ErrorBoundary>

        <ErrorBoundary title="Pintasan">
          <Pintasan />
        </ErrorBoundary>
      </div>
    </QueryClientProvider>
  );
};

export default BerandaContainer;
