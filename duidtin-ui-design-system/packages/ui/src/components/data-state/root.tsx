"use client";

import type { DataStateRootProps } from "../../types/data-state/data-state.types";

/**
 * Pembungkus tiga keadaan sebuah blok data: MEMUAT, GAGAL, KOSONG.
 *
 * Ada di design-system, bukan di repo feature, karena polanya sama persis di
 * tiap fitur — kalau dibuat lokal, tiap feature bakal punya salinannya sendiri
 * yang lama-lama saling melenceng.
 *
 * Dipakai PER BLOK, bukan per halaman: tiap blok punya query sendiri, jadi satu
 * blok yang gagal nggak menjatuhkan blok lain di sebelahnya.
 *
 * Catatan: markup di bawah sengaja polos, BUKAN <EmptyState>/<Button>.
 * `packages/ui` dibangun dengan `bundle: false` — impor ke folder komponen lain
 * jadi eksternal yang nggak bisa di-resolve dan bikin Rspack panic. Kelas
 * CSS-nya tetap kelas EmptyState/Button, jadi tampilannya seragam.
 */
const Root = ({
  children,
  emptyMessage = "Belum ada data.",
  errorDescription = "Server tidak merespons. Data lain di halaman ini tetap bisa dilihat.",
  errorTitle = "Gagal memuat data",
  isEmpty = false,
  isError = false,
  isLoading = false,
  loadingFallback = null,
  onRetry,
  retryLabel = "Coba lagi",
}: DataStateRootProps) => {
  if (isLoading) return <>{loadingFallback}</>;

  if (isError) {
    return (
      <div className="ui-empty-state ui-empty-state--danger ui-empty-state--compact" data-slot="data-state-error" role="alert">
        <div className="ui-empty-state__icon" data-slot="empty-state-icon" aria-hidden="true">
          !
        </div>
        <div className="ui-empty-state__title" data-slot="empty-state-title">
          {errorTitle}
        </div>
        <div className="ui-empty-state__description" data-slot="empty-state-description">
          {errorDescription}
        </div>
        {onRetry ? (
          <div className="ui-empty-state__action" data-slot="empty-state-action">
            <button
              className="ui-button ui-button--outline ui-button--default ui-button--sm"
              onClick={onRetry}
              type="button"
            >
              {retryLabel}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="ui-empty-state ui-empty-state--default ui-empty-state--compact" data-slot="data-state-empty" role="status">
        <div className="ui-empty-state__title" data-slot="empty-state-title">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export { Root };
