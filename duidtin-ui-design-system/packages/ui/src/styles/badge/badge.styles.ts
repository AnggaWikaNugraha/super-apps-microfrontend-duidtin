import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const badgeVariants = tv({
  base: ["ui-badge"],
  defaultVariants: {
    variant: "soft",
    color: "default",
  },
  variants: {
    variant: {
      solid: "ui-badge--solid",
      soft: "ui-badge--soft",
      outlined: "ui-badge--outlined",
    },
    color: {
      default: "ui-badge--default",
      primary: "ui-badge--primary",
      success: "ui-badge--success",
      danger: "ui-badge--danger",
      warning: "ui-badge--warning",
      info: "ui-badge--info",
    },
  },
});

export type BadgeVariants = VariantProps<typeof badgeVariants>;
