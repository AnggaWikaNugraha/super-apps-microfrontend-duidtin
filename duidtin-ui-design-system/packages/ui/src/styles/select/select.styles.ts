import { tv } from "tailwind-variants";

export const selectVariants = tv({
  slots: {
    base: ["ui-select"],
    label: ["ui-select__label"],
    trigger: ["ui-select__trigger"],
    value: ["ui-select__value"],
    popover: ["ui-select__popover"],
    listbox: ["ui-select__listbox"],
    item: ["ui-select__item"],
  },
});
