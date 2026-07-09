"use client";

import { Button as ButtonPrimitive, Label as LabelPrimitive, ListBox as ListBoxPrimitive, ListBoxItem as ListBoxItemPrimitive, Popover as PopoverPrimitive, Select as SelectPrimitive, SelectValue as SelectValuePrimitive } from "react-aria-components";
import { twMerge } from "tailwind-merge";

import { selectVariants } from "../../styles/select/select.styles";
import { composeTwRenderProps } from "../../utils";

import type { SelectItemProps, SelectLabelProps, SelectPopoverProps, SelectRootProps } from "../../types/select/select.types";

const slots = selectVariants();

const Root = <T extends object>({ className, ...rest }: SelectRootProps<T>) => {
  return <SelectPrimitive className={composeTwRenderProps(className, slots.base())} data-slot="select" {...rest} />;
};

const Label = ({ className, ...rest }: SelectLabelProps) => {
  return <LabelPrimitive className={twMerge(slots.label(), className)} data-slot="select-label" {...rest} />;
};

const Trigger = () => (
  <ButtonPrimitive className={slots.trigger()} data-slot="select-trigger">
    <SelectValuePrimitive className={slots.value()} />
    <span aria-hidden="true">▾</span>
  </ButtonPrimitive>
);

const PopoverList = ({ className, children, ...rest }: SelectPopoverProps) => (
  <PopoverPrimitive className={composeTwRenderProps(className, slots.popover())} data-slot="select-popover" {...rest}>
    <ListBoxPrimitive className={slots.listbox()}>{children}</ListBoxPrimitive>
  </PopoverPrimitive>
);

const Item = ({ className, ...rest }: SelectItemProps) => {
  return <ListBoxItemPrimitive className={composeTwRenderProps(className, slots.item())} data-slot="select-item" {...rest} />;
};

export { Root, Label, Trigger, PopoverList, Item };
