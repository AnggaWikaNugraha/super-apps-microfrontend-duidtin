import { Component } from "react";

import type { ErrorInfo, ReactNode } from "react";

interface RemoteErrorBoundaryProps {
  children?: ReactNode;
}

interface RemoteErrorBoundaryState {
  error: Error | null;
}

/**
 * LAPIS 3 error handling — React Error Boundary biasa.
 *
 * Beda kasus dari lapis 1 & 2: dua lapis itu nangani modul yang GAGAL DIMUAT.
 * Yang ini nangani modul yang BERHASIL dimuat tapi CRASH pas dirender (bug di
 * komponen remote-nya sendiri) — kasus yang nggak akan pernah lewat hook
 * errorLoadRemote, karena dari sisi loading semuanya sukses.
 */
class RemoteErrorBoundary extends Component<RemoteErrorBoundaryProps, RemoteErrorBoundaryState> {
  state: RemoteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RemoteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[MFE] Modul remote crash saat render", error, errorInfo);
  }

  render() {
    const { error } = this.state;
    const { children } = this.props;

    if (!error) return children;

    return (
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          justifyContent: "center",
          minHeight: "60vh",
          padding: 24,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Halaman ini gagal ditampilkan</h1>
        <p style={{ color: "#4b5563", margin: 0, maxWidth: 480 }}>
          Modulnya berhasil dimuat tapi error waktu dirender. Coba muat ulang halaman.
        </p>
        {process.env.NODE_ENV === "development" ? (
          <pre
            style={{
              background: "#f9fafb",
              borderRadius: 8,
              color: "#991b1b",
              fontSize: 12,
              marginTop: 8,
              maxWidth: "100%",
              overflowX: "auto",
              padding: 12,
              textAlign: "left",
            }}
          >
            {error.stack ?? error.message}
          </pre>
        ) : null}
      </div>
    );
  }
}

export default RemoteErrorBoundary;
