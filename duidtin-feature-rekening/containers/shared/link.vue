<script setup lang="ts">
import { requestNavigate } from "@/utils/navigate";

/**
 * Tautan ke halaman lain di HOST.
 *
 * Tetap `<a href>` sungguhan, bukan `<span onclick>`: itu yang membuat klik
 * tengah, cmd/ctrl-klik, "buka di tab baru", dan status bar peramban tetap jalan —
 * dan yang membuat tautannya punya arti buat screen reader. JavaScript cuma
 * MENGAMBIL ALIH klik kiri biasa; sisanya dibiarkan ke browser.
 */
const { to } = defineProps<{ to: string }>();

const onClick = (event: MouseEvent) => {
  // Klik yang sudah ditangani orang lain, klik tengah/kanan, atau klik dengan
  // modifier — semuanya milik browser, jangan disentuh.
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return;
  }

  event.preventDefault();
  requestNavigate(event.currentTarget as HTMLElement, to);
};
</script>

<template>
  <a :href="to" @click="onClick"><slot /></a>
</template>
