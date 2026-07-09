import { DateRangePicker } from ".";

import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof DateRangePicker> = {
  title: "Components/DateRangePicker",
  component: DateRangePicker,
};

export default meta;

type Story = StoryObj<typeof DateRangePicker>;

export const Basic: Story = {
  name: "Filter Rentang Tanggal (contoh dashboard)",
};

export const CustomLabel: Story = {
  args: {
    fromLabel: "Tanggal Mulai",
    toLabel: "Tanggal Akhir",
  },
};
