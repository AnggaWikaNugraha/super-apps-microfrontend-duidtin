import { LineChart } from ".";

import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof LineChart> = {
  title: "Components/LineChart",
  component: LineChart,
};

export default meta;

type Story = StoryObj<typeof LineChart>;

const data = [
  { tanggal: "1 Jul", saldo: 42500000 },
  { tanggal: "2 Jul", saldo: 41800000 },
  { tanggal: "3 Jul", saldo: 45200000 },
  { tanggal: "4 Jul", saldo: 44100000 },
  { tanggal: "5 Jul", saldo: 47600000 },
  { tanggal: "6 Jul", saldo: 46300000 },
  { tanggal: "7 Jul", saldo: 49800000 },
];

const rupiah = (v: number) => `Rp ${(v / 1000000).toFixed(1)}jt`;

export const Basic: Story = {
  name: "Tren Saldo Mingguan (contoh dashboard)",
  render: () => <LineChart data={data} categoryKey="tanggal" series={[{ dataKey: "saldo", name: "Saldo", color: "#2563eb" }]} valueFormatter={rupiah} />,
};

export const MultiSeries: Story = {
  name: "Multi Series (Saldo vs Target)",
  render: () => (
    <LineChart
      data={data.map((d) => ({ ...d, target: 45000000 }))}
      categoryKey="tanggal"
      series={[
        { dataKey: "saldo", name: "Saldo Aktual", color: "#2563eb" },
        { dataKey: "target", name: "Target", color: "#f59e0b" },
      ]}
      valueFormatter={rupiah}
    />
  ),
};
