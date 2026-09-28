import "./index";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = { title: "Component Wrapper/Semua elemen" };

export default meta;

type Story = StoryObj;

const dataBar = [
  { bulan: "Jul", masuk: 120, keluar: 80 },
  { bulan: "Agu", masuk: 150, keluar: 95 },
  { bulan: "Sep", masuk: 130, keluar: 110 },
];

/**
 * Seluruh story ini HTML biasa — tidak ada satu pun komponen React ditulis.
 * Persis yang nanti ditulis remote Vue.
 */
export const Semua: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <dtn-button color="primary">Masuk</dtn-button>
        <dtn-button variant="outline">Batal</dtn-button>
        <dtn-badge color="success">Berhasil</dtn-badge>
        <dtn-spinner size="sm" />
      </div>

      <dtn-card variant="elevated">
        <dtn-card-header>Rekening operasional</dtn-card-header>
        <dtn-card-body>Saldo tersedia Rp 842.150.000</dtn-card-body>
      </dtn-card>

      <dtn-alert variant="danger">
        <dtn-alert-content>
          <dtn-alert-title>Sebagian data gagal dimuat</dtn-alert-title>
          <dtn-alert-description>Endpoint rekening sedang tidak bisa diakses.</dtn-alert-description>
        </dtn-alert-content>
      </dtn-alert>

      <dtn-skeleton variant="heading" />
      <dtn-skeleton-lines lines="3" />

      <dtn-empty-state>
        <dtn-empty-state-title>Belum ada persetujuan</dtn-empty-state-title>
        <dtn-empty-state-description>Transaksi yang menunggu akan muncul di sini.</dtn-empty-state-description>
      </dtn-empty-state>

      <dtn-data-state is-loading="true">
        <p>Isi yang disembunyikan saat memuat</p>
      </dtn-data-state>

      <dtn-bar-chart
        category-key="bulan"
        data={JSON.stringify(dataBar)}
        height="200"
        series='[{"dataKey":"masuk","name":"Masuk"},{"dataKey":"keluar","name":"Keluar"}]'
      />
    </div>
  ),
};
