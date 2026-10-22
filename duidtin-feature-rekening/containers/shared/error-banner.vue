<script setup lang="ts">
import { useErrorGlobal } from "@/stores/error-global";

/**
 * Banner error global — jaring pengaman lapis ketiga, sama seperti di beranda.
 *
 * Tiap bagian sudah menampilkan errornya sendiri lewat `<dtn-data-state>`;
 * `QueryCache.onError` menangkap semuanya di satu tempat supaya pengguna tetap
 * sadar ada yang tidak beres walaupun bagian yang gagal sedang tidak terlihat.
 */
const { message, clear } = useErrorGlobal();
</script>

<template>
  <div v-if="message" class="frek-banner">
    <dtn-alert variant="danger">
      <div class="frek-banner__inner">
        <span>Sebagian data belum dapat dimuat. Coba perbarui atau ulangi pada bagian yang bermasalah.</span>
        <dtn-button color="default" size="sm" variant="outline" @press="clear">Tutup</dtn-button>
      </div>
    </dtn-alert>
  </div>
</template>
