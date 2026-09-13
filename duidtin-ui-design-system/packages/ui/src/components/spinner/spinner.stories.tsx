import { Spinner } from ".";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Spinner> = {
  title: "Components/Spinner",
  component: Spinner,
};

export default meta;

type Story = StoryObj<typeof Spinner>;

export const Basic: Story = {
  args: { color: "primary", size: "md" },
};

const sizes = ["sm", "md", "lg", "xl"] as const;

export const AllSizes: Story = {
  name: "Semua Ukuran (perbandingan)",
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      {sizes.map((size) => (
        <Spinner key={size} size={size} />
      ))}
    </div>
  ),
};

export const InButton: Story = {
  name: "Contoh Loading State di Tabel",
  render: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: "var(--dtn-ink-muted)",
        fontSize: 14,
      }}
    >
      <Spinner size="sm" />
      Memuat data transaksi...
    </div>
  ),
};
