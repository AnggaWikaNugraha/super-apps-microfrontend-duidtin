import { PieChart } from ".";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof PieChart> = {
  title: "Components/PieChart",
  component: PieChart,
};

export default meta;

type Story = StoryObj<typeof PieChart>;

const data = [
  { name: "Transfer", value: 45 },
  { name: "Pembayaran Tagihan", value: 28 },
  { name: "Top Up", value: 17 },
  { name: "Lainnya", value: 10 },
];

export const Basic: Story = {
  name: "Distribusi Jenis Transaksi (contoh dashboard)",
  render: () => <PieChart data={data} valueFormatter={(v) => `${v}%`} />,
};

export const Donut: Story = {
  name: "Varian Donut (innerRadius)",
  render: () => (
    <PieChart data={data} innerRadius={60} valueFormatter={(v) => `${v}%`} />
  ),
};
