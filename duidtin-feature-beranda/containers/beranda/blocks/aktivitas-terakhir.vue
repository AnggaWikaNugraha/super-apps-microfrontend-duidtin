<script setup lang="ts">
import { useAktivitasTerakhir } from "@/composables/use-aktivitas-terakhir";

import { rupiah, waktuSingkat } from "../components/format";
import Icon from "../components/icon.vue";

import type { FilterAktivitas } from "@/stores/tampilan-beranda";

const FILTER: { id: FilterAktivitas; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "masuk", label: "Uang masuk" },
  { id: "keluar", label: "Uang keluar" },
];

const { filter, setFilter, ditampilkan, aktivitas, isEmpty, isError, isLoading, retry, warnaStatus, labelStatus } =
  useAktivitasTerakhir();

const labelFilterAktif = () => FILTER.find((item) => item.id === filter.value)?.label;
</script>

<template>
  <dtn-card variant="outlined">
    <dtn-card-header>
      <div class="fber-section-heading">
        <div>
          <h2>Aktivitas terakhir</h2>
          <p>Jejak transaksi masuk dan keluar rekening Anda.</p>
        </div>
        <div class="fber-filters" role="group" aria-label="Filter aktivitas">
          <button
            v-for="item in FILTER"
            :key="item.id"
            type="button"
            :aria-pressed="filter === item.id"
            @click="setFilter(item.id)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </dtn-card-header>
    <dtn-card-body>
      <dtn-skeleton-lines v-if="isLoading" :lines="5" />

      <dtn-data-state
        v-else
        empty-message="Belum ada aktivitas rekening."
        :is-empty="isEmpty"
        :is-error="isError"
        @retry="retry"
      >
        <div class="fber-table-scroll" role="region" aria-label="Tabel aktivitas rekening" :tabindex="0">
          <table class="fber-transactions">
            <caption class="fber-sr-only">Aktivitas terakhir — {{ labelFilterAktif() }}</caption>
            <thead>
              <tr>
                <th scope="col">Transaksi</th>
                <th scope="col">Waktu</th>
                <th scope="col" class="fber-transactions__amount">Nominal</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in ditampilkan" :key="item.id">
                <th scope="row">
                  <div class="fber-transaction">
                    <span :class="`fber-transaction__icon fber-transaction__icon--${item.arah}`">
                      <Icon :name="item.arah === 'masuk' ? 'incoming' : 'outgoing'" />
                    </span>
                    <div>
                      <span class="fber-list__title">{{ item.keterangan }}</span>
                      <span class="fber-list__meta">{{ item.arah === "masuk" ? "Uang masuk" : "Uang keluar" }}</span>
                    </div>
                  </div>
                </th>
                <td>
                  <time :datetime="item.waktu">{{ waktuSingkat(item.waktu) }}</time>
                </td>
                <td
                  class="fber-transactions__amount"
                  :class="{ 'fber-transactions__amount--masuk': item.arah === 'masuk' }"
                >
                  {{ item.arah === "masuk" ? "+" : "−" }} {{ rupiah(item.nominal) }}
                </td>
                <td>
                  <dtn-badge :color="warnaStatus(item.status)" variant="soft">{{ labelStatus(item.status) }}</dtn-badge>
                </td>
              </tr>
              <tr v-if="ditampilkan.length === 0">
                <td :colspan="4" class="fber-transactions__empty">Tidak ada aktivitas untuk filter ini.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="fber-transactions__count" aria-live="polite">
          Menampilkan {{ ditampilkan.length }} dari {{ aktivitas.length }} transaksi terbaru
        </p>
      </dtn-data-state>
    </dtn-card-body>
  </dtn-card>
</template>
