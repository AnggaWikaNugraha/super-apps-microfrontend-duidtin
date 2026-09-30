import { computed, getCurrentScope, onScopeDispose, shallowRef, type ComputedRef } from "vue";

import type { StoreApi } from "zustand/vanilla";

/**
 * Jembatan store `zustand/vanilla` → ref Vue.
 *
 * Zustand sendiri tidak tahu-menahu soal framework; yang framework-spesifik cuma
 * cara berlangganannya. Versi React memakai `useStore` bawaan zustand, versi Vue
 * enam baris di bawah ini. Pola yang sama persis dipakai `@duidtin/auth/vue`
 * untuk store sesi milik host.
 *
 * `shallowRef`: state-nya diganti utuh tiap kali store berubah, bukan diubah
 * sebagian — jadi tidak perlu proxy dalam.
 */
export const bacaStore = <TState, TPilihan>(
  store: StoreApi<TState>,
  pilih: (state: TState) => TPilihan,
): ComputedRef<TPilihan> => {
  const state = shallowRef<TState>(store.getState());

  const berhentiLangganan = store.subscribe((berikutnya) => {
    state.value = berikutnya;
  });

  // Di luar komponen/effectScope tidak ada yang bisa melepas langganan; biarkan
  // hidup daripada melempar warning.
  if (getCurrentScope()) onScopeDispose(berhentiLangganan);

  return computed(() => pilih(state.value));
};
