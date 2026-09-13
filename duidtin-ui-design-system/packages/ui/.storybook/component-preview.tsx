import "../src/styles/index.tailwind.css";
import "./preview.css";
import { Badge } from "../src/components/badge";
import type { Preview } from "@storybook/react";

const descriptions: Record<string, string> = {
  Button: "Aksi yang jelas untuk setiap langkah transaksi bisnis.",
  Card: "Ringkasan dan informasi rekening dalam permukaan yang terstruktur.",
  Badge: "Status transaksi yang ringkas dan mudah dipindai.",
  Table:
    "Detail transaksi dengan hierarki informasi dan nominal yang mudah dibandingkan.",
  Select: "Pilih rekening atau periode untuk mengatur tampilan data.",
  DateRangePicker:
    "Tentukan rentang tanggal untuk meninjau aktivitas rekening.",
  Spinner: "Penanda proses yang sedang berjalan.",
  Alert: "Pemberitahuan dengan status dan langkah selanjutnya yang jelas.",
  Modal: "Tinjau detail sebelum mengonfirmasi tindakan.",
  Tabs: "Beralih antarbagian tanpa kehilangan konteks.",
  BarChart: "Bandingkan pemasukan dan pengeluaran bisnis.",
  LineChart: "Pantau perkembangan saldo dari waktu ke waktu.",
  PieChart: "Lihat komposisi pengeluaran dalam satu tampilan.",
  Skeleton: "Pertahankan struktur informasi saat data sedang dimuat.",
  EmptyState: "Berikan konteks saat belum ada aktivitas rekening.",
  DataState:
    "Tampilan konsisten saat memuat, kosong, atau gagal mengambil data.",
  ErrorBoundary:
    "Pulihkan bagian yang gagal ditampilkan tanpa mengganggu bagian lainnya.",
};

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  decorators: [
    (Story, context) => {
      if (!context.title.startsWith("Components/")) return <Story />;
      const component = context.title.split("/").at(-1) ?? "Komponen";
      return (
        <main className="dtn-story">
          <div className="dtn-story__container">
            <header className="dtn-story__header">
              <div>
                <div className="dtn-story__brand">
                  duitin<span>.</span>
                </div>
                <div className="dtn-story__brand-caption">BUSINESS BANKING</div>
              </div>
              <Badge color="primary" variant="soft">
                Design system · Preview
              </Badge>
            </header>
            <div className="dtn-story__intro">
              <p className="dtn-story__eyebrow">KOMPONEN / {component}</p>
              <h1>{component}</h1>
              <p className="dtn-story__description">
                {descriptions[component]}
              </p>
            </div>
            <section
              className="dtn-story__section"
              aria-label={`${component} — ${context.name}`}
            >
              <div className="dtn-story__section-heading">
                <span>01</span>
                <h2>{context.name}</h2>
              </div>
              <div className="dtn-story__surface" data-component={component}>
                <Story />
              </div>
            </section>
            <footer className="dtn-story__footer">
              Duitin Business · Komponen bersama untuk pengalaman perbankan yang
              konsisten.
            </footer>
          </div>
        </main>
      );
    },
  ],
};
export default preview;
