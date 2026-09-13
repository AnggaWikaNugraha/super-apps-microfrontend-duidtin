import { tv } from "tailwind-variants";

export const emptyStateVariants = tv({
  base: ["ui-empty-state"],
  defaultVariants: {
    variant: "default",
    size: "md",
  },
  variants: {
    variant: {
      default: "ui-empty-state--default",
      danger: "ui-empty-state--danger",
    },
    size: {
      md: "",
      compact: "ui-empty-state--compact",
    },
  },
});
