import { useEffect, useState } from "react";

import { bacaRemoteLokal } from "@/services/federation/utils/remote-lokal";

/**
 * Pengingat di pojok layar selama ada remote yang diambil dari localhost, supaya
 * tidak lupa sedang melihat kode lokal di halaman produksi.
 */
const PenandaRemoteLokal = () => {
  const [daftar, setDaftar] = useState<[string, string][]>([]);

  // dibaca setelah mount: localStorage tidak ada saat Next prerender di server
  useEffect(() => {
    setDaftar(Object.entries(bacaRemoteLokal()));
  }, []);

  if (daftar.length === 0) return null;

  return (
    <div
      role="status"
      style={{
        background: "#7c2d12",
        borderRadius: 8,
        bottom: 12,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
        color: "#fff",
        font: "12px/1.5 system-ui, sans-serif",
        left: 12,
        maxWidth: 360,
        padding: "8px 10px",
        position: "fixed",
        zIndex: 2147483647,
      }}
    >
      <strong>Remote lokal aktif</strong>
      {daftar.map(([nama, origin]) => (
        <div key={nama}>
          {nama} → {origin}
        </div>
      ))}
      <a href="?remote-lokal=hapus" style={{ color: "#fed7aa" }}>
        kembali ke versi normal
      </a>
    </div>
  );
};

export default PenandaRemoteLokal;
