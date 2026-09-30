<script setup lang="ts">
import { useAuth } from "@duidtin/auth/vue";

import { usePageHeading } from "@/composables/use-page-heading";

import Icon from "./icon.vue";

/**
 * Kepala halaman — sekaligus BUKTI store sesi menyeberangi framework.
 *
 * `useAuth()` di sini versi Vue dari `@duidtin/auth`, tapi store yang dibacanya
 * persis store yang sama: `zustand/vanilla` yang dipasang host React di
 * `window.__DUIDTIN_AUTH__`. Login lewat modal React di host membuat sapaan di
 * bawah ikut berubah, tanpa satu pun props yang dilewatkan host.
 *
 * `user` itu ref, jadi di template ia otomatis ter-unwrap.
 */
const { user } = useAuth();
const { isFetching, perbarui } = usePageHeading();
</script>

<template>
  <header class="fber-page__heading">
    <div>
      <p class="fber-page__eyebrow">RINGKASAN BISNIS</p>
      <h1 class="fber-page__title">
        {{ user ? `Selamat datang, ${user.nama.split(" ")[0]}.` : "Keuangan Anda, dalam kendali." }}
      </h1>
      <p class="fber-page__lead">
        Pantau saldo, tinjau persetujuan, dan ikuti aktivitas rekening
        {{ user?.perusahaan.nama ?? "perusahaan" }}.
      </p>
    </div>
    <div class="fber-page__actions">
      <dtn-badge color="info" variant="soft">Data contoh</dtn-badge>
      <dtn-button color="default" variant="outline" :is-disabled="isFetching" @press="perbarui">
        <Icon name="refresh" />
        {{ isFetching ? "Memperbarui" : "Perbarui" }}
      </dtn-button>
    </div>
  </header>
</template>
