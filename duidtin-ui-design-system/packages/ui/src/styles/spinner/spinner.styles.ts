import { tv } from "tailwind-variants";

export const spinnerVariants = tv({
  base: ["ui-spinner"],
  defaultVariants: {
    color: "primary",
    size: "md",
  },
  variants: {
    color: {
      default: "ui-spinner--default",
      primary: "ui-spinner--primary",
      success: "ui-spinner--success",
      danger: "ui-spinner--danger",
      warning: "ui-spinner--warning",
      current: "ui-spinner--current",
    },
    size: {
      sm: "ui-spinner--sm",
      md: "ui-spinner--md",
      lg: "ui-spinner--lg",
      xl: "ui-spinner--xl",
    },
  },
});
