import { tv } from "tailwind-variants";

export const buttonVariants = tv({
  base: ["ui-button"],
  variants: {
    variant: {
      solid: "ui-button--solid",
      outline: "ui-button--outline",
    },
    color: {
      primary: "ui-button--primary",
      default: "ui-button--default",
    },
    size: {
      sm: "ui-button--sm",
      md: "ui-button--md",
    },
  },
  defaultVariants: {
    variant: "solid",
    color: "primary",
    size: "md",
  },
});
