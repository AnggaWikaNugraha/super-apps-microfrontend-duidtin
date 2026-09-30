<script setup lang="ts">
import { useErrorGlobal } from "@/stores/error-global";

/**
 * ERROR GLOBAL SAAT API HIT — lapis ketiga.
 *
 * Tiap blok sudah menampilkan error-nya sendiri lewat `<dtn-data-state>`. Banner
 * ini menangkap SEMUA query yang gagal di satu tempat lewat `QueryCache.onError`,
 * jadi pengguna tetap sadar ada yang tidak beres walaupun blok yang gagal
 * kebetulan sedang tidak terlihat di layar.
 *
 * Komponennya sendiri nggak punya state — semuanya di store.
 */
const { pesan, bersihkan } = useErrorGlobal();
</script>

<template>
  <div v-if="pesan" class="fber-banner">
    <dtn-alert variant="danger">
      <div class="fber-banner__inner">
        <span>Sebagian data belum dapat dimuat. Coba perbarui atau ulangi pada bagian yang bermasalah.</span>
        <!-- `press` itu CustomEvent yang di-dispatch pembungkus design-system,
             bukan event DOM bawaan — React Aria yang melahirkannya di dalam. -->
        <dtn-button color="default" size="sm" variant="outline" @press="bersihkan">Tutup</dtn-button>
      </div>
    </dtn-alert>
  </div>
</template>
