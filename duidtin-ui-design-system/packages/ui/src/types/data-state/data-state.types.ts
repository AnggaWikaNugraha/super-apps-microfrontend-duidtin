import type { ReactNode } from "react";

export interface DataStateRootProps {
  children: ReactNode;
  /** Pesan waktu query sukses tapi datanya kosong. */
  emptyMessage?: string;
  errorDescription?: string;
  errorTitle?: string;
  isEmpty?: boolean;
  isError?: boolean;
  isLoading?: boolean;
  /** Placeholder saat memuat — idealnya Skeleton yang bentuknya menyerupai isi aslinya. */
  loadingFallback?: ReactNode;
  /** Kalau diisi, tombol "Coba lagi" muncul di tampilan error. */
  onRetry?: () => void;
  retryLabel?: string;
}
