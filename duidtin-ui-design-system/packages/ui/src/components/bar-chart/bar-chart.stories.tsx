import { BarChart } from ".";

import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof BarChart> = {
  title: "Components/BarChart",
  component: BarChart,
};

export default meta;

type Story = StoryObj<typeof BarChart>;

const data = [
  { bulan: "Jan", masuk: 12500000, keluar: 8200000 },
  { bulan: "Feb", masuk: 15200000, keluar: 9100000 },
  { bulan: "Mar", masuk: 11800000, keluar: 10500000 },
  { bulan: "Apr", masuk: 18400000, keluar: 12300000 },
  { bulan: "Mei", masuk: 16700000, keluar: 11900000 },
];

const rupiah = (v: number) => `Rp ${(v / 1000000).toFixed(1)}jt`;

export const Basic: Story = {
  name: "Arus Kas Bulanan (contoh dashboard)",
  render: () => (
    <BarChart
      data={data}
      categoryKey="bulan"
      series={[
        { dataKey: "masuk", name: "Uang Masuk", color: "#16a34a" },
        { dataKey: "keluar", name: "Uang Keluar", color: "#dc2626" },
      ]}
      valueFormatter={rupiah}
    />
  ),
};

export const NoLegendNoGrid: Story = {
  name: "Tanpa Legend & Grid",
  render: () => <BarChart data={data} categoryKey="bulan" series={[{ dataKey: "masuk", name: "Uang Masuk" }]} showLegend={false} showGrid={false} valueFormatter={rupiah} height={200} />,
};
