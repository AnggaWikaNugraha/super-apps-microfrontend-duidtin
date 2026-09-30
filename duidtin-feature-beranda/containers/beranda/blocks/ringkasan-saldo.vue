<script setup lang="ts">
import { useRingkasanSaldo } from "@/composables/use-ringkasan-saldo";

import { mataUang, rupiah } from "../components/format";
import Icon from "../components/icon.vue";

const {
  terlihat,
  toggleSaldo,
  isEmpty,
  isError,
  isLoading,
  jumlahRekening,
  jumlahRekeningRupiah,
  jumlahRekeningValas,
  totalValas,
  retry,
  total,
} = useRingkasanSaldo();
</script>

<template>
  <dtn-card variant="elevated" class="fber-saldo">
    <dtn-card-body>
      <!--
        KEADAAN MEMUAT DITANGANI DI SINI, BUKAN OLEH <dtn-data-state>.

        Prop `loadingFallback` milik DataState itu ReactNode — tidak ada padanannya
        sebagai atribut HTML, jadi pembungkusnya tidak membawanya. Tanpa fallback,
        `is-loading` cuma menyembunyikan isi dan halaman jadi kosong. Vue punya
        `v-if`, jadi kerangkanya dirender langsung di sini dan `<dtn-data-state>`
        dipakai untuk apa yang MEMANG bisa diatribusikan: kosong dan gagal.
      -->
      <div v-if="isLoading" class="fber-saldo__loading">
        <dtn-skeleton variant="text" />
        <dtn-skeleton variant="heading" />
        <dtn-skeleton-lines :lines="2" />
      </div>

      <dtn-data-state v-else :is-empty="isEmpty" :is-error="isError" @retry="retry">
        <div class="fber-saldo__top">
          <span class="fber-saldo__label">
            <Icon name="wallet" />
            Saldo rekening rupiah
          </span>
          <button
            type="button"
            class="fber-saldo__visibility"
            :aria-label="terlihat ? 'Sembunyikan saldo ringkasan' : 'Tampilkan saldo ringkasan'"
            :aria-pressed="!terlihat"
            @click="toggleSaldo"
          >
            <Icon name="eye" />
          </button>
        </div>
        <p class="fber-saldo__value">{{ terlihat ? rupiah(total) : "••••••••" }}</p>
        <p class="fber-saldo__caption">Total dari {{ jumlahRekeningRupiah }} rekening IDR</p>
        <div class="fber-saldo__bottom">
          <div>
            <span>Rekening terdaftar</span>
            <strong>{{ jumlahRekening }} rekening</strong>
          </div>
          <div v-if="jumlahRekeningValas > 0">
            <span>Saldo valas · USD</span>
            <strong>{{ terlihat ? mataUang(totalValas, "USD") : "••••••" }}</strong>
          </div>
        </div>
      </dtn-data-state>
    </dtn-card-body>
  </dtn-card>
</template>
