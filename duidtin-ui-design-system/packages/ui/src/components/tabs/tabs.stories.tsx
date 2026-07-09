import { Tabs } from ".";

import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof Tabs> = {
  title: "Components/Tabs",
  component: Tabs,
};

export default meta;

type Story = StoryObj<typeof Tabs>;

export const Basic: Story = {
  name: "Switch Periode (contoh dashboard)",
  render: () => (
    <Tabs aria-label="Periode ringkasan" style={{ maxWidth: 420 }}>
      <Tabs.List>
        <Tabs.Tab id="harian">Harian</Tabs.Tab>
        <Tabs.Tab id="mingguan">Mingguan</Tabs.Tab>
        <Tabs.Tab id="bulanan">Bulanan</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel id="harian">Ringkasan transaksi hari ini: 12 transaksi, total Rp 3.200.000.</Tabs.Panel>
      <Tabs.Panel id="mingguan">Ringkasan transaksi minggu ini: 84 transaksi, total Rp 22.500.000.</Tabs.Panel>
      <Tabs.Panel id="bulanan">Ringkasan transaksi bulan ini: 312 transaksi, total Rp 98.750.000.</Tabs.Panel>
    </Tabs>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Tabs aria-label="Periode dengan salah satu disabled" style={{ maxWidth: 420 }}>
      <Tabs.List>
        <Tabs.Tab id="harian">Harian</Tabs.Tab>
        <Tabs.Tab id="mingguan" isDisabled>
          Mingguan (belum tersedia)
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel id="harian">Konten harian.</Tabs.Panel>
      <Tabs.Panel id="mingguan">Konten mingguan.</Tabs.Panel>
    </Tabs>
  ),
};
