<script setup lang="ts">
import { computed, ref } from "vue";

import { useAccountDetail } from "@/composables/use-account-detail";

import ErrorBanner from "../shared/error-banner.vue";
import ErrorBoundary from "../shared/error-boundary.vue";
import { formatCurrency, formatLongDate, formatShortTime } from "../shared/format";
import Link from "../shared/link.vue";

/**
 * `id` datang dari HOST sebagai root props — host yang memiliki route
 * `/rekening/[id]`, jadi remote tidak pernah menebak bentuk URL.
 */
const { id } = defineProps<{ id: string }>();

const {
  account,
  isLoading,
  isError,
  retry,
  activities,
  isActivitiesEmpty,
  isActivitiesLoading,
  isActivitiesError,
  retryActivities,
} = useAccountDetail(() => id);

const columns = [
  { id: "keterangan", label: "Transaksi", isRowHeader: true },
  { id: "waktu", label: "Waktu" },
  { id: "nominal", label: "Nominal" },
  { id: "status", label: "Status" },
];

const rows = computed(() =>
  activities.value.map((activity) => ({
    id: activity.id,
    keterangan: activity.keterangan,
    waktu: formatShortTime(activity.waktu),
    nominal: `${activity.arah === "masuk" ? "+" : "−"} ${formatCurrency(activity.nominal, account.value?.mataUang ?? "IDR")}`,
    status: { berhasil: "Berhasil", diproses: "Diproses", gagal: "Gagal" }[activity.status],
  })),
);

/** `<dtn-modal>` dibuka lewat atribut, pemicunya di luar elemen. */
const isModalOpen = ref(false);
</script>

<template>
  <div class="frek-page">
    <Link class="frek-kembali" to="/rekening">← Semua rekening</Link>

    <ErrorBanner />

    <ErrorBoundary title="Detail rekening">
      <dtn-skeleton-lines v-if="isLoading" :lines="4" />

      <dtn-data-state v-else :is-error="isError" @retry="retry">
        <header v-if="account" class="frek-page__heading">
          <div>
            <p class="frek-page__eyebrow">{{ account.nomor }}</p>
            <h1 class="frek-page__title">{{ account.nama }}</h1>
            <p class="frek-page__lead">Dibuka {{ formatLongDate(account.dibuatPada) }}</p>
          </div>
          <div class="frek-page__actions">
            <dtn-badge color="default" variant="soft">{{ account.mataUang }}</dtn-badge>
            <dtn-button color="default" variant="outline" @press="isModalOpen = true">Lihat nomor</dtn-button>
          </div>
        </header>

        <dtn-card v-if="account" variant="elevated" class="frek-saldo">
          <dtn-card-body>
            <span class="frek-saldo__label">Saldo tersedia</span>
            <p class="frek-saldo__nilai">{{ formatCurrency(account.saldo, account.mataUang) }}</p>
          </dtn-card-body>
        </dtn-card>
      </dtn-data-state>
    </ErrorBoundary>

    <ErrorBoundary title="Aktivitas rekening">
      <dtn-card variant="outlined">
        <dtn-card-header>
          <div class="frek-section-heading">
            <div>
              <h2>Aktivitas terakhir</h2>
              <p>Sepuluh transaksi terbaru di rekening ini.</p>
            </div>
          </div>
        </dtn-card-header>
        <dtn-card-body>
          <dtn-skeleton-lines v-if="isActivitiesLoading" :lines="5" />

          <dtn-data-state
            v-else
            empty-message="Belum ada aktivitas di rekening ini."
            :is-empty="isActivitiesEmpty"
            :is-error="isActivitiesError"
            @retry="retryActivities"
          >
            <dtn-table :columns="columns" :rows="rows" size="md" />
          </dtn-data-state>
        </dtn-card-body>
      </dtn-card>
    </ErrorBoundary>

    <!-- isinya anak light DOM; React Aria merender overlay-nya lewat portal -->
    <dtn-modal heading="Nomor rekening" :is-open="isModalOpen" @dtn-close="isModalOpen = false">
      <p class="frek-modal__nomor">{{ account?.nomor }}</p>
      <p class="frek-modal__catatan">Salin nomor ini untuk menerima transfer masuk.</p>
    </dtn-modal>
  </div>
</template>
