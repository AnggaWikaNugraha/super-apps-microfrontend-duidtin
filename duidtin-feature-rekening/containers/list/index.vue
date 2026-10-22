<script setup lang="ts">
import { computed } from "vue";

import { useAccountList } from "@/composables/use-account-list";

import ErrorBanner from "../shared/error-banner.vue";
import ErrorBoundary from "../shared/error-boundary.vue";
import { formatCurrency } from "../shared/format";
import Link from "../shared/link.vue";

const {
  currency,
  selectCurrency,
  visibleAccounts,
  isEmpty,
  isError,
  isLoading,
  retry,
  totalCount,
  totalIdr,
  totalUsd,
  hasForeignCurrency,
} = useAccountList();

const FILTER = [
  { id: "all", label: "Semua" },
  { id: "IDR", label: "Rupiah" },
  { id: "USD", label: "Valas" },
];

/**
 * `<dtn-table>` menerima kolom dan baris sebagai JSON, dan isi selnya sebatas
 * teks. Jadi angka diformat DI SINI, bukan di dalam tabel — itu batas elemen
 * rakitan yang disadari sejak awal.
 */
const columns = [
  { id: "nama", label: "Nama rekening", isRowHeader: true },
  { id: "nomor", label: "Nomor" },
  { id: "mataUang", label: "Mata uang" },
  { id: "saldo", label: "Saldo" },
];

const rows = computed(() =>
  visibleAccounts.value.map((account) => ({
    id: account.id,
    nama: account.nama,
    nomor: account.nomor,
    mataUang: account.mataUang,
    saldo: formatCurrency(account.saldo, account.mataUang),
  })),
);
</script>

<template>
  <div class="frek-page">
    <header class="frek-page__heading">
      <div>
        <p class="frek-page__eyebrow">REKENING PERUSAHAAN</p>
        <h1 class="frek-page__title">Semua rekening Anda.</h1>
        <p class="frek-page__lead">Saldo terpisah untuk setiap kebutuhan, dalam satu daftar.</p>
      </div>
      <dtn-badge color="info" variant="soft">{{ totalCount }} rekening</dtn-badge>
    </header>

    <ErrorBanner />

    <ErrorBoundary title="Ringkasan saldo">
      <div class="frek-ringkasan">
        <dtn-card variant="elevated">
          <dtn-card-body>
            <span class="frek-ringkasan__label">Total rupiah</span>
            <p class="frek-ringkasan__nilai">{{ formatCurrency(totalIdr, "IDR") }}</p>
          </dtn-card-body>
        </dtn-card>
        <dtn-card v-if="hasForeignCurrency" variant="outlined">
          <dtn-card-body>
            <span class="frek-ringkasan__label">Total valas · USD</span>
            <p class="frek-ringkasan__nilai">{{ formatCurrency(totalUsd, "USD") }}</p>
          </dtn-card-body>
        </dtn-card>
      </div>
    </ErrorBoundary>

    <ErrorBoundary title="Daftar rekening">
      <dtn-card variant="outlined">
        <dtn-card-header>
          <div class="frek-section-heading">
            <div>
              <h2>Daftar rekening</h2>
              <p>Klik satu baris untuk melihat detail dan aktivitasnya.</p>
            </div>
            <!-- elemen rakitan: daftar tab dari atribut JSON, terkendali -->
            <dtn-tabs :items="FILTER" :value="currency" @dtn-change="selectCurrency($event.detail)" />
          </div>
        </dtn-card-header>
        <dtn-card-body>
          <dtn-skeleton-lines v-if="isLoading" :lines="5" />

          <dtn-data-state
            v-else
            empty-message="Belum ada rekening terdaftar."
            :is-empty="isEmpty"
            :is-error="isError"
            @retry="retry"
          >
            <!-- elemen rakitan: kolom + baris dari atribut JSON -->
            <dtn-table :columns="columns" :rows="rows" size="md" />

            <p v-if="rows.length === 0" class="frek-kosong">Tidak ada rekening untuk filter ini.</p>

            <!-- navigasi keluar lewat peristiwa DOM; host yang memanggil router -->
            <ul class="frek-tautan">
              <li v-for="account in visibleAccounts" :key="account.id">
                <Link :to="`/rekening/${account.id}`">{{ account.nama }} →</Link>
              </li>
            </ul>
          </dtn-data-state>
        </dtn-card-body>
      </dtn-card>
    </ErrorBoundary>
  </div>
</template>
