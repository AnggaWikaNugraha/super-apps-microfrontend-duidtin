<script setup lang="ts">
import Icon from "../components/icon.vue";

const PINTASAN = [
  { label: "Transfer", icon: "transfer" },
  { label: "Payroll", icon: "payroll" },
  { label: "Mutasi", icon: "document" },
  { label: "Persetujuan", icon: "check" },
] as const;
</script>

<template>
  <dtn-card variant="outlined" class="fber-shortcuts-card">
    <dtn-card-header>
      <h2>Akses cepat</h2>
    </dtn-card-header>
    <dtn-card-body>
      <div class="fber-shortcuts">
        <button v-for="item in PINTASAN" :key="item.label" type="button" class="fber-shortcut" disabled>
          <span class="fber-shortcut__icon">
            <Icon :name="item.icon" />
          </span>
          <span>{{ item.label }}</span>
        </button>
      </div>
      <p class="fber-shortcuts__note">Fitur transaksi segera tersedia.</p>
    </dtn-card-body>
  </dtn-card>
</template>
