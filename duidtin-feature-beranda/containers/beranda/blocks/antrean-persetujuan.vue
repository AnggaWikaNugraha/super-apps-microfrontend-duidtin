<script setup lang="ts">
import { useAntreanPersetujuan } from "@/composables/use-antrean-persetujuan";

import { rupiah, waktuSingkat } from "../components/format";

const { antrean, isEmpty, isError, isLoading, retry } = useAntreanPersetujuan();
</script>

<template>
  <dtn-card variant="outlined">
    <dtn-card-header>
      <div class="fber-section-heading">
        <div>
          <h2>Menunggu persetujuan</h2>
          <p>Transaksi yang membutuhkan perhatian.</p>
        </div>
        <dtn-badge v-if="!isLoading && !isError" color="warning" variant="soft">
          {{ antrean.length }} transaksi
        </dtn-badge>
      </div>
    </dtn-card-header>
    <dtn-card-body>
      <dtn-skeleton-lines v-if="isLoading" :lines="5" />

      <dtn-data-state
        v-else
        empty-message="Semua beres. Tidak ada transaksi yang menunggu otorisasi."
        :is-empty="isEmpty"
        :is-error="isError"
        @retry="retry"
      >
        <ul class="fber-approvals">
          <li v-for="item in antrean" :key="item.id" class="fber-approval">
            <div class="fber-approval__top">
              <dtn-badge color="warning" variant="soft">{{ item.jenis }}</dtn-badge>
              <strong class="fber-list__amount">{{ rupiah(item.nominal) }}</strong>
            </div>
            <p class="fber-list__title">{{ item.tujuan }}</p>
            <p class="fber-list__meta">Oleh {{ item.dibuatOleh }} · {{ waktuSingkat(item.dibuatPada) }}</p>
          </li>
        </ul>
      </dtn-data-state>
    </dtn-card-body>
  </dtn-card>
</template>
