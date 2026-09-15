/**
 * Isi `/` selama remote `duidtin_feature_beranda` dilepas dari host. Tetap
 * dibungkus layout remote lewat `getLayout`, jadi header, sidebar, dan komponen
 * design-system di dalamnya tetap bisa diverifikasi di produksi.
 *
 * Angkanya statis, bukan data sungguhan.
 */
const RINGKASAN = [
  { label: "Saldo tersedia", value: "Rp 0" },
  { label: "Menunggu persetujuan", value: "0 transaksi" },
];

const BerandaSementara = () => (
  <section className="app-page">
    <div>
      <h1 className="app-page__title">Beranda</h1>
      <p className="app-page__lead">
        Halaman sementara dari host. Modul beranda belum dipasang di lingkungan ini, jadi angka di
        bawah hanya contoh.
      </p>
    </div>

    <div className="app-page__grid">
      {RINGKASAN.map((item) => (
        <div className="app-page__card" key={item.label}>
          <p className="app-page__stat-label">{item.label}</p>
          <p className="app-page__stat-value">{item.value}</p>
        </div>
      ))}
    </div>
  </section>
);

export default BerandaSementara;
