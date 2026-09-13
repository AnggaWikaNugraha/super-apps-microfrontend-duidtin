import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Alert,
  Badge,
  BarChart,
  Button,
  Card,
  DataState,
  DateRangePicker,
  EmptyState,
  ErrorBoundary,
  LineChart,
  Modal,
  PieChart,
  Select,
  Skeleton,
  Spinner,
  Table,
  Tabs,
} from "../index";

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12,
};
const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: 24,
};
const money = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
const chartData = [
  { month: "Apr", masuk: 32, keluar: 22 },
  { month: "Mei", masuk: 48, keluar: 30 },
  { month: "Jun", masuk: 42, keluar: 26 },
  { month: "Jul", masuk: 65, keluar: 38 },
  { month: "Agu", masuk: 58, keluar: 34 },
  { month: "Sep", masuk: 82, keluar: 45 },
];
const series = [
  { dataKey: "masuk", name: "Pemasukan" },
  { dataKey: "keluar", name: "Pengeluaran" },
];
const transactions = [
  {
    id: "TRX-00241",
    name: "PT Sumber Makmur",
    detail: "Pembayaran invoice",
    amount: 12500000,
    status: "success" as const,
    label: "Berhasil",
  },
  {
    id: "TRX-00242",
    name: "PT Cipta Karya",
    detail: "Transfer antarbank",
    amount: 4750000,
    status: "warning" as const,
    label: "Diproses",
  },
  {
    id: "TRX-00243",
    name: "CV Maju Bersama",
    detail: "Pembayaran supplier",
    amount: 8200000,
    status: "danger" as const,
    label: "Gagal",
  },
];

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={{ marginTop: 40 }}>
      <div style={{ ...row, marginBottom: 16 }}>
        <span
          style={{
            fontSize: 12,
            color: "var(--dtn-ink-subtle)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {number}
        </span>
        <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.02em" }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
function Failure({ broken }: { broken: boolean }) {
  if (broken) throw new Error("Simulated showcase failure");
  return (
    <Alert variant="success">
      <Alert.Content>
        <Alert.Title>Komponen berhasil dimuat</Alert.Title>
      </Alert.Content>
    </Alert>
  );
}
function BusinessShowcase() {
  const [compact, setCompact] = useState(false);
  const [retry, setRetry] = useState(false);
  const [broken, setBroken] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(20px, 4vw, 56px)",
        background: "var(--dtn-canvas)",
        color: "var(--dtn-ink)",
        fontFamily: "var(--dtn-font)",
        lineHeight: 1.5,
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <header
          style={{
            ...row,
            justifyContent: "space-between",
            paddingBottom: 28,
            borderBottom: "1px solid var(--dtn-line)",
          }}
        >
          <div>
            <div
              style={{ fontSize: 25, fontWeight: 750, letterSpacing: "-.05em" }}
            >
              duitin<span style={{ color: "var(--dtn-primary)" }}>.</span>
            </div>
            <div style={{ color: "var(--dtn-ink-muted)", fontSize: 12 }}>
              BUSINESS BANKING
            </div>
          </div>
          <Badge color="primary" variant="soft">
            Design system · Preview
          </Badge>
        </header>
        <div style={{ paddingTop: 32 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--dtn-primary)",
              letterSpacing: ".1em",
            }}
          >
            RUANG KERJA KEUANGAN
          </p>
          <h1
            style={{
              marginTop: 8,
              fontSize: "clamp(28px, 4vw, 38px)",
              fontWeight: 600,
              letterSpacing: "-.035em",
            }}
          >
            Setiap detail, lebih terarah.
          </h1>
          <p
            style={{
              marginTop: 12,
              color: "var(--dtn-ink-muted)",
              maxWidth: 600,
            }}
          >
            Komponen yang konsisten untuk mengelola transaksi, membaca arus kas,
            dan mengambil keputusan dengan percaya diri.
          </p>
        </div>

        <Section number="01" title="Ringkasan & permukaan">
          <div style={grid}>
            {(["outlined", "elevated", "soft"] as const).map((variant, i) => (
              <Card key={variant} variant={variant}>
                <Card.Header>
                  {
                    [
                      "Saldo tersedia",
                      "Pemasukan bulan ini",
                      "Menunggu persetujuan",
                    ][i]
                  }
                </Card.Header>
                <Card.Body>
                  <div
                    style={{
                      fontSize: 30,
                      lineHeight: 1.3,
                      fontWeight: 600,
                      color: "var(--dtn-ink)",
                      letterSpacing: "-.04em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {["Rp 248.500.000", "Rp 82.000.000", "12 transaksi"][i]}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <Badge
                      color={i === 2 ? "warning" : "success"}
                      variant="soft"
                    >
                      {i === 2 ? "Perlu ditinjau" : "+12,8% bulan ini"}
                    </Badge>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        </Section>
        <Section number="02" title="Aksi & formulir">
          <Card>
            <div style={row}>
              <Modal.Root>
                <Button>Transfer dana</Button>
                <Modal.Content>
                  {({ close }) => (
                    <>
                      <Modal.Heading>Konfirmasi transfer</Modal.Heading>
                      <Modal.Body>
                        Periksa detail transfer sebelum melanjutkan.
                        <div
                          style={{
                            padding: 20,
                            background: "var(--dtn-surface-muted)",
                            borderRadius: 10,
                            marginTop: 20,
                          }}
                        >
                          <div>PT Sumber Makmur · 0012 3456 7890</div>
                          <strong
                            style={{ color: "var(--dtn-ink)", fontSize: 24 }}
                          >
                            {money(12500000)}
                          </strong>
                        </div>
                      </Modal.Body>
                      <Modal.Footer>
                        <Button
                          variant="outline"
                          color="default"
                          onPress={close}
                        >
                          Batal
                        </Button>
                        <Button
                          onPress={() => {
                            setConfirmed(true);
                            close();
                          }}
                        >
                          Konfirmasi
                        </Button>
                      </Modal.Footer>
                    </>
                  )}
                </Modal.Content>
              </Modal.Root>
              <Button variant="outline">Jadwalkan transfer</Button>
              <Button variant="outline" color="default">
                Unduh laporan
              </Button>
              <Button color="default">Simpan draft</Button>
              <Button size="sm" variant="outline" color="default">
                Detail
              </Button>
              <Button isDisabled>Tidak tersedia</Button>
              <Button isPending>
                <Spinner color="current" size="sm" />
                Memproses
              </Button>
            </div>
            <div style={{ ...grid, marginTop: 28 }}>
              <Select
                placeholder="Pilih rekening"
                defaultSelectedKey="operasional"
              >
                <Select.Label>Rekening sumber</Select.Label>
                <Select.Trigger />
                <Select.Popover>
                  <Select.Item id="operasional">
                    Giro operasional · 7890
                  </Select.Item>
                  <Select.Item id="payroll">
                    Rekening payroll · 1234
                  </Select.Item>
                  <Select.Item id="cadangan">
                    Rekening cadangan · 5678
                  </Select.Item>
                </Select.Popover>
              </Select>
              <DateRangePicker
                fromInputProps={{ defaultValue: "2026-09-01" }}
                toInputProps={{ defaultValue: "2026-09-30" }}
              />
            </div>
            {confirmed && (
              <div style={{ marginTop: 20 }}>
                <Alert variant="success">
                  <Alert.Content>
                    <Alert.Title>
                      Simulasi transfer berhasil dikonfirmasi
                    </Alert.Title>
                    <Alert.Description>
                      Ini hanya preview komponen; tidak ada dana yang
                      dipindahkan.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              </div>
            )}
          </Card>
        </Section>
        <Section number="03" title="Navigasi & transaksi">
          <Card>
            <Tabs defaultSelectedKey="transaksi">
              <Tabs.List aria-label="Aktivitas rekening">
                <Tabs.Tab id="transaksi">Transaksi terbaru</Tabs.Tab>
                <Tabs.Tab id="jadwal">Terjadwal</Tabs.Tab>
                <Tabs.Tab id="arsip" isDisabled>
                  Arsip
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel id="transaksi">
                <div
                  style={{
                    ...row,
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <span style={{ color: "var(--dtn-ink-muted)", fontSize: 13 }}>
                    3 transaksi · September 2026
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    color="default"
                    onPress={() => setCompact(!compact)}
                  >
                    {compact ? "Tampilan nyaman" : "Tampilan compact"}
                  </Button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <Table
                    aria-label="Transaksi terbaru"
                    size={compact ? "sm" : "md"}
                    selectionMode="single"
                    selectionBehavior="replace"
                  >
                    <Table.Header>
                      <Table.Column isRowHeader>Transaksi</Table.Column>
                      <Table.Column>Referensi</Table.Column>
                      <Table.Column data-align="right">Nominal</Table.Column>
                      <Table.Column>Status</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {transactions.map((t) => (
                        <Table.Row key={t.id} id={t.id}>
                          <Table.Cell>
                            <div
                              style={{ fontWeight: 600, whiteSpace: "nowrap" }}
                            >
                              {t.name}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--dtn-ink-subtle)",
                                marginTop: 3,
                              }}
                            >
                              {t.detail}
                            </div>
                          </Table.Cell>
                          <Table.Cell>{t.id}</Table.Cell>
                          <Table.Cell
                            data-align="right"
                            style={{ whiteSpace: "nowrap", fontWeight: 600 }}
                          >
                            {money(t.amount)}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant="soft" color={t.status}>
                              {t.label}
                            </Badge>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
              </Tabs.Panel>
              <Tabs.Panel id="jadwal">
                <EmptyState>
                  <EmptyState.Title>
                    Belum ada transfer terjadwal
                  </EmptyState.Title>
                  <EmptyState.Description>
                    Transfer yang dijadwalkan akan muncul di sini.
                  </EmptyState.Description>
                </EmptyState>
              </Tabs.Panel>
            </Tabs>
          </Card>
        </Section>
        <Section number="04" title="Grafik keuangan">
          <div style={grid}>
            <Card>
              <Card.Header>
                Arus kas{" "}
                <span style={{ fontSize: 12, fontWeight: 400 }}>
                  · juta rupiah
                </span>
              </Card.Header>
              <BarChart data={chartData} categoryKey="month" series={series} />
            </Card>
            <Card>
              <Card.Header>Tren pemasukan</Card.Header>
              <LineChart
                data={chartData}
                categoryKey="month"
                series={series.slice(0, 1)}
                valueFormatter={(v) => `${v} jt`}
              />
            </Card>
            <Card>
              <Card.Header>Alokasi pengeluaran</Card.Header>
              <PieChart
                innerRadius={58}
                data={[
                  { name: "Operasional", value: 45 },
                  { name: "Payroll", value: 35 },
                  { name: "Lainnya", value: 20 },
                ]}
                valueFormatter={(v) => `${v}%`}
              />
            </Card>
          </div>
        </Section>
        <Section number="05" title="Status & pemberitahuan">
          <Card>
            <div style={row}>
              {(
                [
                  "default",
                  "primary",
                  "success",
                  "warning",
                  "danger",
                  "info",
                ] as const
              ).map((color, i) => (
                <div key={color} style={{ display: "grid", gap: 12 }}>
                  {(["soft", "outlined", "solid"] as const).map((variant) => (
                    <Badge key={variant} color={color} variant={variant}>
                      {
                        [
                          "Draft",
                          "Terjadwal",
                          "Berhasil",
                          "Diproses",
                          "Gagal",
                          "Informasi",
                        ][i]
                      }
                    </Badge>
                  ))}
                </div>
              ))}
            </div>
          </Card>
          <div style={{ ...grid, marginTop: 24 }}>
            {(
              [
                "default",
                "primary",
                "success",
                "warning",
                "danger",
                "info",
              ] as const
            ).map((variant, i) => (
              <Alert key={variant} variant={variant}>
                <Alert.Icon aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v6m0 3v1" />
                  </svg>
                </Alert.Icon>
                <Alert.Content>
                  <Alert.Title>
                    {
                      [
                        "Draft tersimpan",
                        "Rekening utama aktif",
                        "Transfer berhasil",
                        "Persetujuan diperlukan",
                        "Transfer belum berhasil",
                        "Laporan tersedia",
                      ][i]
                    }
                  </Alert.Title>
                  <Alert.Description>
                    {
                      [
                        "Lanjutkan pengisian kapan saja.",
                        "Rekening ini digunakan untuk transaksi bisnis.",
                        "Detail transaksi dapat dilihat pada riwayat.",
                        "Tinjau detail transaksi sebelum menyetujui.",
                        "Periksa rekening tujuan dan coba kembali.",
                        "Laporan bulan ini siap diunduh.",
                      ][i]
                    }
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            ))}
          </div>
        </Section>
        <Section number="06" title="Memuat, kosong & pemulihan">
          <div style={grid}>
            <Card>
              <Card.Header>Memuat ringkasan</Card.Header>
              <div style={{ ...row, marginBottom: 24 }}>
                <Spinner size="sm" />
                <Spinner />
                <Spinner size="lg" />
                <Spinner size="xl" />
              </div>
              <div style={{ display: "grid", gap: 20 }}>
                <Skeleton variant="circle" />
                <Skeleton variant="heading" />
                <Skeleton.Lines />
                <Skeleton variant="block" />
              </div>
            </Card>
            <EmptyState>
              <EmptyState.Icon aria-hidden="true">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M5 3h10l4 4v14H5zM9 11h6m-6 4h4" />
                </svg>
              </EmptyState.Icon>
              <EmptyState.Title>Belum ada aktivitas</EmptyState.Title>
              <EmptyState.Description>
                Semua transaksi rekening Anda akan tampil di sini setelah
                transaksi pertama.
              </EmptyState.Description>
            </EmptyState>
            <DataState isError={!retry} onRetry={() => setRetry(true)}>
              <Alert variant="success">
                <Alert.Content>
                  <Alert.Title>Data berhasil dimuat kembali</Alert.Title>
                </Alert.Content>
              </Alert>
            </DataState>
          </div>
          <div style={{ ...grid, marginTop: 24 }}>
            <Card>
              <Card.Header>Data kosong</Card.Header>
              <DataState
                isEmpty
                emptyMessage="Tidak ada transaksi pada periode ini."
              >
                {null}
              </DataState>
            </Card>
            <Card>
              <Card.Header>Loading per bagian</Card.Header>
              <DataState
                isLoading
                loadingFallback={<Skeleton.Lines lines={4} />}
              >
                {null}
              </DataState>
            </Card>
            <Card>
              <Card.Header>Pemulihan komponen</Card.Header>
              <ErrorBoundary resetKeys={[broken]}>
                <Failure broken={broken} />
              </ErrorBoundary>
              <div style={{ marginTop: 16 }}>
                <Button
                  variant="outline"
                  color="default"
                  size="sm"
                  onPress={() => setBroken(!broken)}
                >
                  {broken ? "Pulihkan komponen" : "Simulasikan error"}
                </Button>
              </div>
            </Card>
          </div>
        </Section>
        <footer
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid var(--dtn-line)",
            color: "var(--dtn-ink-subtle)",
            fontSize: 12,
          }}
        >
          Duitin Business · Komponen bersama untuk pengalaman perbankan yang
          konsisten.
        </footer>
      </div>
    </main>
  );
}
const meta = {
  title: "Foundations/Business Banking",
  component: BusinessShowcase,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof BusinessShowcase>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Overview: Story = {};
