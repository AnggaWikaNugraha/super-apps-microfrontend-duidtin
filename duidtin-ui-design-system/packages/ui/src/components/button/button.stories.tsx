import { Button } from ".";

import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  args: {
    children: "Button",
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Solid: Story = {
  args: { variant: "solid", color: "primary", size: "md" },
};

export const Outline: Story = {
  args: { variant: "outline", color: "primary", size: "md" },
};

export const Small: Story = {
  args: { size: "sm" },
};
