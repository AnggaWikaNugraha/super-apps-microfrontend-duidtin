import { tv } from "tailwind-variants";

export const skeletonVariants = tv({
  base: ["ui-skeleton"],
  defaultVariants: {
    variant: "text",
  },
  variants: {
    variant: {
      text: "ui-skeleton--text",
      heading: "ui-skeleton--heading",
      block: "ui-skeleton--block",
      circle: "ui-skeleton--circle",
    },
  },
});
