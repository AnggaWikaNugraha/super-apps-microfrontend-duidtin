"use client";

import { Component } from "react";

import type {
  ErrorBoundaryRootProps,
  ErrorBoundaryState,
} from "../../types/error-boundary/error-boundary.types";
import type { ErrorInfo } from "react";

/**
 * Error boundary umum buat dipakai feature remote.
 *
 * Beda dari `RemoteErrorBoundary` milik host: yang di host membungkus SELURUH
 * isi aplikasi, jadi satu crash mengganti seluruh halaman. Yang ini dipasang
 * di dalam fitur — bisa per-fitur atau per-blok — sehingga satu blok yang crash
 * nggak menjatuhkan blok lain di sekitarnya.
 *
 * Sengaja ada di design-system supaya tiap feature remote nggak nulis ulang
 * class component yang sama.
 */
class Root extends Component<ErrorBoundaryRootProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryRootProps) {
    const { resetKeys } = this.props;

    if (!this.state.error || !resetKeys) return;

    const changed =
      resetKeys.length !== prevProps.resetKeys?.length ||
      resetKeys.some((key, index) => !Object.is(key, prevProps.resetKeys?.[index]));

    if (changed) this.reset();
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback, title } = this.props;

    if (!error) return children;

    if (fallback) return fallback({ error, reset: this.reset });

    /*
     * Markup polos, BUKAN <EmptyState> / <Button>.
     *
     * `packages/ui` dibangun dengan `bundle: false` — tiap berkas dikompilasi
     * sendiri-sendiri, jadi impor ke folder komponen lain (`../empty-state`)
     * jadi eksternal yang nggak bisa di-resolve dan bikin Rspack panic. Satu-
     * satunya berkas yang boleh mengimpor komponen lain adalah `*.stories.tsx`,
     * karena stories dikecualikan dari build.
     *
     * Kelas CSS-nya tetap kelas EmptyState/Button, jadi tampilannya seragam
     * tanpa perlu ketergantungan antar komponen.
     */
    return (
      <div className="ui-empty-state ui-empty-state--danger" data-slot="empty-state">
        <div className="ui-empty-state__icon" data-slot="empty-state-icon">
          !
        </div>
        <div className="ui-empty-state__title" data-slot="empty-state-title">
          {title ? `${title} gagal ditampilkan` : "Gagal ditampilkan"}
        </div>
        <div className="ui-empty-state__description" data-slot="empty-state-description">
          Terjadi kesalahan saat merender bagian ini. Coba muat ulang; kalau berulang, laporkan ke tim.
        </div>
        <div className="ui-empty-state__action" data-slot="empty-state-action">
          <button
            className="ui-button ui-button--outline ui-button--default ui-button--sm"
            onClick={this.reset}
            type="button"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }
}

export { Root };
