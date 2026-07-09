import { Item, Label, PopoverList, Root, Trigger } from "./root";

export const Select = Object.assign(Root, {
  Root,
  Label,
  Trigger,
  Popover: PopoverList,
  Item,
});

export type { SelectItemProps, SelectLabelProps, SelectPopoverProps, SelectRootProps } from "../../types/select/select.types";
