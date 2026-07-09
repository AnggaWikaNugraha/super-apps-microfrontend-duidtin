import { tv } from "tailwind-variants";

export const dateRangePickerVariants = tv({
  slots: {
    base: ["ui-date-range-picker"],
    field: ["ui-date-range-picker__field"],
    label: ["ui-date-range-picker__label"],
    input: ["ui-date-range-picker__input"],
    separator: ["ui-date-range-picker__separator"],
  },
});
