<script setup lang="ts">
import { onErrorCaptured, ref } from "vue";

/**
 * Penangkap crash saat RENDER — padanan `<ErrorBoundary>` React di design-system.
 *
 * KENAPA LOKAL, BUKAN DARI DESIGN-SYSTEM:
 * `ErrorBoundary` sengaja TIDAK dibungkus jadi `<dtn-error-boundary>`. Error
 * boundary React cuma menangkap error di dalam pohon React-nya sendiri, sementara
 * anak yang di-slot lewat light DOM bukan bagian pohon itu — elemennya akan
 * terlihat bekerja padahal tidak menangkap apa pun. Alasannya ada di
 * `component-wrapper/error-boundary/index.ts`.
 *
 * Vue punya mekanismenya sendiri, dan justru lebih sederhana: `onErrorCaptured`
 * satu hook, tanpa class component.
 *
 * Dipasang PER BLOK, bukan per halaman: satu blok yang crash nggak menjatuhkan
 * blok lain di sebelahnya.
 *
 * Markup fallback-nya polos dengan kelas CSS design-system (`ui-empty-state`,
 * `ui-button`) — sama persis dengan yang dipakai versi React-nya, jadi
 * tampilannya seragam tanpa ketergantungan komponen.
 */
const { title } = defineProps<{ title?: string }>();

const error = ref<Error | null>(null);

onErrorCaptured((gagal) => {
  error.value = gagal instanceof Error ? gagal : new Error(String(gagal));

  // false = jangan teruskan ke atas. Blok ini sudah menampilkan pesannya sendiri.
  return false;
});

const ulangi = () => {
  error.value = null;
};
</script>

<template>
  <slot v-if="!error" />

  <div v-else class="ui-empty-state ui-empty-state--danger" data-slot="empty-state" role="alert">
    <div class="ui-empty-state__icon" data-slot="empty-state-icon" aria-hidden="true">!</div>
    <div class="ui-empty-state__title" data-slot="empty-state-title">
      {{ title ? `${title} gagal ditampilkan` : "Gagal ditampilkan" }}
    </div>
    <div class="ui-empty-state__description" data-slot="empty-state-description">
      Terjadi kesalahan saat merender bagian ini. Coba muat ulang; kalau berulang, laporkan ke tim.
    </div>
    <div class="ui-empty-state__action" data-slot="empty-state-action">
      <button class="ui-button ui-button--outline ui-button--default ui-button--sm" type="button" @click="ulangi">
        Coba lagi
      </button>
    </div>
  </div>
</template>
