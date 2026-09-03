/**
 * Halaman SEMENTARA buat verifikasi visual selama host (`duidtin-ui`) belum ada.
 * Hapus begitu host bisa render layout ini lewat loadRemote("duidtin_ui_layout/default").
 *
 * Yang KE-TES di sini: render layout + konsumsi remote design-system (Badge/Button
 * di header ditarik runtime lewat loadRemote).
 * Yang BELUM ke-tes: expose "./default"-nya sendiri, share scope react lintas host,
 * dan resolusi URL remote di luar localhost.
 */
import Default from "@/layouts/default";

const PreviewPage = () => (
  <Default
    activePath="/transaksi"
    onLogout={() => window.alert("logout ditekan")}
    userName="Angga"
  >
    <section style={{ display: "flex", flexDirection: "column", gap: 12, padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Konten dummy</h1>
      <p style={{ color: "#4b5563", margin: 0 }}>
        Header di atas dan footer di bawah datang dari <code>layouts/default</code>. Badge
        &quot;Angga&quot; dan tombol &quot;Keluar&quot; di header datang dari remote{" "}
        <code>duidtin_ui_design_system</code> — kalau dua-duanya muncul dengan style-nya, jalur
        Module Federation ke design-system sudah benar.
      </p>
    </section>
  </Default>
);

export default PreviewPage;
