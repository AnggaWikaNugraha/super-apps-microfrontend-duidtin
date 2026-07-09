import type { ReactNode } from "react";
import type { LabelProps, ListBoxItemProps, PopoverProps, SelectProps } from "react-aria-components";

export interface SelectRootProps<T extends object = object> extends SelectProps<T> {}

export interface SelectLabelProps extends LabelProps {}

export interface SelectPopoverProps extends Omit<PopoverProps, "children"> {
  children?: ReactNode;
}

export interface SelectItemProps extends ListBoxItemProps {}
