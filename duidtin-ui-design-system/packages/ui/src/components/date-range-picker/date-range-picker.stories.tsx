import { DateRangePicker } from ".";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof DateRangePicker> = {
  title: "Components/DateRangePicker",
  component: DateRangePicker,
  args: {
    fromInputProps: { defaultValue: "2026-09-01" },
    toInputProps: { defaultValue: "2026-09-30" },
  },
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
