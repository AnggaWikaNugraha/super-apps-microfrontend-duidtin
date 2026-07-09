import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const tableVariants = tv({
  slots: {
    base: ["ui-table"],
    header: ["ui-table__header"],
    column: ["ui-table__column"],
    body: ["ui-table__body"],
    row: ["ui-table__row"],
    cell: ["ui-table__cell"],
  },
  variants: {
    size: {
      sm: { column: "ui-table__column--sm", cell: "ui-table__cell--sm" },
      md: { column: "ui-table__column--md", cell: "ui-table__cell--md" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type TableVariants = VariantProps<typeof tableVariants>;
