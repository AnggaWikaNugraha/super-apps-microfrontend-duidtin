import { tv } from "tailwind-variants";

export const modalVariants = tv({
  slots: {
    overlay: ["ui-modal__overlay"],
    modal: ["ui-modal"],
    heading: ["ui-modal__heading"],
    body: ["ui-modal__body"],
    footer: ["ui-modal__footer"],
  },
});
