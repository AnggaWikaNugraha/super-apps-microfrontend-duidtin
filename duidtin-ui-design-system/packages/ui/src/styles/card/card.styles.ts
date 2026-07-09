import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const cardVariants = tv({
  base: ["ui-card"],
  variants: {
    size: {
      sm: "ui-card--sm",
      md: "ui-card--md",
      lg: "ui-card--lg",
    },
    variant: {
      elevated: "ui-card--elevated",
      outlined: "ui-card--outlined",
      soft: "ui-card--soft",
    },
  },
  defaultVariants: {
    size: "md",
    variant: "elevated",
  },
});

export type CardVariants = VariantProps<typeof cardVariants>;
