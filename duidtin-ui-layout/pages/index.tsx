/**
 * Bukan halaman preview. `duidtin-ui-layout` cuma remote — layout-nya baru
 * kelihatan beneran kalau dirender host (`duidtin-ui`) lewat
 * loadRemote("duidtin_ui_layout/default"). Halaman ini semata guard biar jelas
 * pas repo-nya dibuka langsung.
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
    <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>duidtin-ui-layout</h1>
    <p style={{ color: "#4b5563", margin: 0, maxWidth: 520 }}>
      Modul ini nggak bisa jalan sendirian. Dia remote Module Federation yang cuma dipasang lewat host{" "}
      <code>duidtin-ui</code> pakai <code>loadRemote(&quot;duidtin_ui_layout/default&quot;)</code>.
    </p>
    <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>
      remoteEntry: <code>/layout/_next/static/chunks/remoteEntry.js</code>
    </p>
  </main>
);

export default GuardPage;
