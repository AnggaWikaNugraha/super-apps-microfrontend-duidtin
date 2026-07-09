import { PieChart } from ".";

import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof PieChart> = {
  title: "Components/PieChart",
  component: PieChart,
};

export default meta;

type Story = StoryObj<typeof PieChart>;

const data = [
  { name: "Transfer", value: 45, color: "#2563eb" },
  { name: "Pembayaran Tagihan", value: 28, color: "#16a34a" },
  { name: "Top Up", value: 17, color: "#f59e0b" },
  { name: "Lainnya", value: 10, color: "#7c3aed" },
];

export const Basic: Story = {
  name: "Distribusi Jenis Transaksi (contoh dashboard)",
  render: () => <PieChart data={data} valueFormatter={(v) => `${v}%`} />,
};

export const Donut: Story = {
  name: "Varian Donut (innerRadius)",
  render: () => <PieChart data={data} innerRadius={60} valueFormatter={(v) => `${v}%`} />,
};
