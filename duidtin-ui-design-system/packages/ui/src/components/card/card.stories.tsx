import { Button } from "../button";
import { Card } from ".";

import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof Card> = {
  title: "Components/Card",
  component: Card,
};

export default meta;

type Story = StoryObj<typeof Card>;

export const Elevated: Story = {
  args: { variant: "elevated", size: "md" },
  render: (args) => (
    <Card {...args} style={{ maxWidth: 360 }}>
      <Card.Header>Konfirmasi Transfer</Card.Header>
      <Card.Body>Anda akan mentransfer Rp 2.500.000 ke rekening 1234567890 a.n. Budi Santoso.</Card.Body>
      <Card.Footer>
        <Button variant="outline" color="default">
          Batal
        </Button>
        <Button variant="solid" color="primary">
          Konfirmasi
        </Button>
      </Card.Footer>
    </Card>
  ),
};

export const Outlined: Story = {
  args: { variant: "outlined", size: "md" },
  render: (args) => (
    <Card {...args} style={{ maxWidth: 360 }}>
      <Card.Header>Informasi Akun</Card.Header>
      <Card.Body>Data akun Anda sudah terverifikasi dan aktif sepenuhnya.</Card.Body>
    </Card>
  ),
};

export const Soft: Story = {
  args: { variant: "soft", size: "sm" },
  render: (args) => (
    <Card {...args} style={{ maxWidth: 280 }}>
      <Card.Body>Card ukuran kecil, varian soft — cocok buat info sekunder.</Card.Body>
    </Card>
  ),
};

export const StatCard: Story = {
  name: "Stat Card (contoh dashboard)",
  args: { variant: "elevated", size: "md" },
  render: (args) => (
    <div style={{ display: "flex", gap: 16 }}>
      <Card {...args} style={{ width: 220 }}>
        <p style={{ fontSize: 13, color: "var(--ui-color-gray-500, #6b7280)", marginBottom: 8 }}>Total Saldo</p>
        <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Rp 42.500.000</p>
        <p style={{ fontSize: 13, color: "#16a34a", marginTop: 8 }}>+3.2% dari bulan lalu</p>
      </Card>
      <Card {...args} style={{ width: 220 }}>
        <p style={{ fontSize: 13, color: "var(--ui-color-gray-500, #6b7280)", marginBottom: 8 }}>Transaksi Bulan Ini</p>
        <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>128</p>
        <p style={{ fontSize: 13, color: "#dc2626", marginTop: 8 }}>-1.4% dari bulan lalu</p>
      </Card>
    </div>
  ),
};

export const AllVariants: Story = {
  name: "Semua Varian (perbandingan)",
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <Card variant="elevated" size="md" style={{ width: 200 }}>
        <Card.Header>Elevated</Card.Header>
        <Card.Body>Shadow lembut, tanpa border.</Card.Body>
      </Card>
      <Card variant="outlined" size="md" style={{ width: 200 }}>
        <Card.Header>Outlined</Card.Header>
        <Card.Body>Border tipis, tanpa shadow.</Card.Body>
      </Card>
      <Card variant="soft" size="md" style={{ width: 200 }}>
        <Card.Header>Soft</Card.Header>
        <Card.Body>Background abu-abu lembut.</Card.Body>
      </Card>
    </div>
  ),
};
