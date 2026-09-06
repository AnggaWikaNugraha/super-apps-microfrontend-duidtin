/**
 * Halaman guard, bukan preview fitur.
 *
 * Konten beranda yang sebenarnya ada di `containers/beranda/index.tsx` dan cuma
 * kelihatan kalau dirender host lewat loadRemote("duidtin_feature_beranda/base").
 * Halaman ini semata penanda kalau repo-nya dibuka langsung.
 */
const GuardPage = () => (
  <main
    style={{
      alignItems: "center",
      display: "flex",
      flexDirection: "column",
      fontFamily: "system-ui, sans-serif",
      gap: 12,
      justifyContent: "center",
      minHeight: "100vh",
      padding: 24,
      textAlign: "center",
    }}
  >
    <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>duidtin-feature-beranda</h1>
    <p style={{ color: "#4b5563", margin: 0, maxWidth: 540 }}>
      Modul ini nggak bisa jalan sendirian. Dia remote Module Federation yang dipasang host{" "}
      <code>duidtin-ui</code> di route <code>/</code> lewat{" "}
      <code>loadRemote(&quot;duidtin_feature_beranda/base&quot;)</code>.
    </p>
    <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>
      remoteEntry: <code>/beranda/_next/static/chunks/remoteEntry.js</code>
    </p>
  </main>
);

export default GuardPage;
