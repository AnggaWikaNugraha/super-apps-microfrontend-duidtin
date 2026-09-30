<script setup lang="ts">
import AktivitasTerakhir from "./blocks/aktivitas-terakhir.vue";
import AntreanPersetujuan from "./blocks/antrean-persetujuan.vue";
import Pintasan from "./blocks/pintasan.vue";
import RekeningPerusahaan from "./blocks/rekening-perusahaan.vue";
import RingkasanSaldo from "./blocks/ringkasan-saldo.vue";
import ErrorBoundary from "./components/error-boundary.vue";
import GlobalErrorBanner from "./components/global-error-banner.vue";
import PageHeading from "./components/page-heading.vue";

/**
 * Isi beranda — dipasang `expose/base.ts` dan dirender host di route "/".
 *
 * DUA LAPIS PENANGANAN ERROR:
 *   1. ErrorBoundary    — crash saat RENDER. Dipasang per blok, jadi satu blok
 *                         yang crash nggak menjatuhkan blok lain.
 *   2. <dtn-data-state> — query GAGAL. Tiap blok punya query sendiri, jadi
 *                         keadaan gagalnya independen.
 * Ditambah GlobalErrorBanner yang menangkap semua kegagalan query di satu tempat
 * lewat QueryCache.onError.
 */
</script>

<template>
  <div class="fber-page">
    <PageHeading />

    <GlobalErrorBanner />

    <div class="fber-page__overview">
      <ErrorBoundary title="Ringkasan saldo">
        <RingkasanSaldo />
      </ErrorBoundary>
      <ErrorBoundary title="Pintasan">
        <Pintasan />
      </ErrorBoundary>
    </div>

    <div class="fber-page__grid">
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
  </div>
</template>
