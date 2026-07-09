import { tv } from "tailwind-variants";

export const alertVariants = tv({
  base: ["ui-alert"],
  defaultVariants: {
    variant: "info",
  },
  variants: {
    variant: {
      default: "ui-alert--default",
      primary: "ui-alert--primary",
      success: "ui-alert--success",
      warning: "ui-alert--warning",
      danger: "ui-alert--danger",
      info: "ui-alert--info",
    },
  },
});
