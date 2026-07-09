import { Badge } from ".";

import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof Badge> = {
  title: "Components/Badge",
  component: Badge,
  args: {
    children: "Badge",
  },
};

export default meta;

type Story = StoryObj<typeof Badge>;

export const Soft: Story = {
  args: { variant: "soft", color: "primary" },
};

export const Solid: Story = {
  args: { variant: "solid", color: "primary" },
};

export const Outlined: Story = {
  args: { variant: "outlined", color: "primary" },
};

const colors = ["default", "primary", "success", "danger", "warning", "info"] as const;

export const AllColors: Story = {
  name: "Semua Warna (perbandingan)",
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {colors.map((color) => (
        <Badge key={color} variant="soft" color={color}>
          {color}
        </Badge>
      ))}
    </div>
  ),
};

export const StatusContoh: Story = {
  name: "Contoh Status Transaksi",
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <Badge variant="soft" color="success">
        Berhasil
      </Badge>
      <Badge variant="soft" color="warning">
        Diproses
      </Badge>
      <Badge variant="soft" color="danger">
        Gagal
      </Badge>
      <Badge variant="soft" color="default">
        Kadaluarsa
      </Badge>
    </div>
  ),
};
