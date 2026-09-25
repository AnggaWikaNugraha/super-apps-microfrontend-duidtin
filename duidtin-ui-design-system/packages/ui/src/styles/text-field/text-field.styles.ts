import { tv } from "tailwind-variants";

export const textFieldVariants = tv({
  slots: {
    base: ["ui-text-field"],
    label: ["ui-text-field__label"],
    input: ["ui-text-field__input"],
    description: ["ui-text-field__description"],
    error: ["ui-text-field__error"],
  },
});
