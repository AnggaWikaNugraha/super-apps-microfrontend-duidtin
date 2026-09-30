<script setup lang="ts">
import { useRekeningPerusahaan } from "@/composables/use-rekening-perusahaan";

import { mataUang } from "../components/format";
import Icon from "../components/icon.vue";

const { isEmpty, isError, isLoading, rekening, retry } = useRekeningPerusahaan();
</script>

<template>
  <dtn-card variant="outlined">
    <dtn-card-header>
      <div class="fber-section-heading">
        <div>
          <h2>Rekening perusahaan</h2>
          <p>Saldo terpisah untuk setiap kebutuhan.</p>
        </div>
        <dtn-badge v-if="!isLoading && !isError" color="default" variant="soft">
          {{ rekening.length }} rekening
        </dtn-badge>
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
        <ul class="fber-accounts">
          <li v-for="item in rekening" :key="item.id" class="fber-account">
            <span class="fber-account__icon">
              <Icon name="wallet" />
            </span>
            <div class="fber-account__detail">
              <span class="fber-list__title">{{ item.nama }}</span>
              <span class="fber-list__meta">{{ item.nomor }}</span>
            </div>
            <div class="fber-account__balance">
              <strong>{{ mataUang(item.saldo, item.mataUang) }}</strong>
              <span>{{ item.mataUang }}</span>
            </div>
          </li>
        </ul>
      </dtn-data-state>
    </dtn-card-body>
  </dtn-card>
</template>
