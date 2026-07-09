import { tv } from "tailwind-variants";

export const tabsVariants = tv({
  slots: {
    root: ["ui-tabs"],
    list: ["ui-tabs__list"],
    tab: ["ui-tabs__tab"],
    panel: ["ui-tabs__panel"],
  },
});
