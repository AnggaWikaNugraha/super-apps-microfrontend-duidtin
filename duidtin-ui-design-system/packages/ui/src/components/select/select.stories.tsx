import { Select } from ".";

import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof Select> = {
  title: "Components/Select",
  component: Select,
};

export default meta;

type Story = StoryObj<typeof Select>;

export const Basic: Story = {
  name: "Filter Periode (contoh dashboard)",
  render: () => (
    <Select placeholder="Pilih periode" aria-label="Periode">
      <Select.Label>Periode</Select.Label>
      <Select.Trigger />
      <Select.Popover>
        <Select.Item id="daily">Harian</Select.Item>
        <Select.Item id="weekly">Mingguan</Select.Item>
        <Select.Item id="monthly">Bulanan</Select.Item>
      </Select.Popover>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select placeholder="Pilih periode" aria-label="Periode" isDisabled>
      <Select.Label>Periode</Select.Label>
      <Select.Trigger />
      <Select.Popover>
        <Select.Item id="daily">Harian</Select.Item>
        <Select.Item id="weekly">Mingguan</Select.Item>
      </Select.Popover>
    </Select>
  ),
};
