import type { ModuleFederationRuntimePlugin } from "@module-federation/runtime/types";

const isDev = process.env.NODE_ENV === "development";

interface FallbackProps {
  moduleId: string;
}

const Fallback = ({ moduleId }: FallbackProps) => (
  <div
    style={{
      background: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: 8,
      color: "#991b1b",
      fontSize: 14,
      padding: 16,
    }}
  >
    {isDev ? (
      <>
        <strong>Modul remote gagal dimuat:</strong> <code>{moduleId}</code>
        <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 6 }}>
          Cek dev server remote-nya sudah nyala dan `entryPath` di registry sudah benar.
        </div>
      </>
    ) : (
      "Bagian ini sedang tidak bisa ditampilkan. Coba muat ulang halaman."
    )}
  </div>
);

/**
 * LAPIS 2 error handling. Nyantol di hook `errorLoadRemote`, yang baru dipanggil
 * SETELAH retry di RetryPlugin (lapis 1) habis.
 *
 * Tugasnya: ganti modul yang gagal dimuat jadi komponen aman, supaya satu remote
 * mati nggak nyeret seluruh halaman jadi blank.
 *
 * Beda kasus dari RemoteErrorBoundary (lapis 3): yang ini soal gagal LOAD,
 * yang itu soal modul sukses dimuat tapi CRASH pas dirender.
 */
export const fallbackPlugin = (): ModuleFederationRuntimePlugin => ({
  name: "duidtin-fallback-plugin",
  errorLoadRemote({ error, id }: { error?: unknown; id: string }) {
    console.error(`[MFE] Gagal load remote "${id}", pakai fallback`, error);

    return { default: () => <Fallback moduleId={id} /> };
  },
});
