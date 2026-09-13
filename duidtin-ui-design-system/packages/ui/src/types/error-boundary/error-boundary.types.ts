import type { ErrorInfo, ReactNode } from "react";

export interface ErrorBoundaryRenderProps {
  error: Error;
  /** Bersihkan state error dan coba render ulang children. */
  reset: () => void;
}

export interface ErrorBoundaryRootProps {
  children?: ReactNode;
  /**
   * Ganti tampilan default. Menerima `error` dan `reset` supaya fallback bisa
   * menyediakan tombol coba lagi sendiri.
   */
  fallback?: (props: ErrorBoundaryRenderProps) => ReactNode;
  /** Dipanggil sekali tiap kali error tertangkap — buat logging/telemetri. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Kalau salah satu nilai di array ini berubah, state error otomatis di-reset.
   * Berguna buat mengulang render waktu route atau filter berganti.
   */
  resetKeys?: unknown[];
  /** Label yang muncul di pesan default, mis. "Beranda". */
  title?: string;
}

export interface ErrorBoundaryState {
  error: Error | null;
}
