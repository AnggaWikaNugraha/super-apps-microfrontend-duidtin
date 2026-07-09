"use client";

import { useId } from "react";

import { dateRangePickerVariants } from "../../styles/date-range-picker/date-range-picker.styles";

import type { DateRangePickerRootProps } from "../../types/date-range-picker/date-range-picker.types";

const Root = ({ className, fromLabel = "Dari", toLabel = "Sampai", fromInputProps, toInputProps }: DateRangePickerRootProps) => {
  const slots = dateRangePickerVariants();
  const fromId = useId();
  const toId = useId();

  return (
    <div className={slots.base({ class: className })} data-slot="date-range-picker">
      <div className={slots.field()}>
        <label className={slots.label()} htmlFor={fromId}>
          {fromLabel}
        </label>
        <input id={fromId} type="date" className={slots.input()} {...fromInputProps} />
      </div>
      <span className={slots.separator()} aria-hidden="true">
        –
      </span>
      <div className={slots.field()}>
        <label className={slots.label()} htmlFor={toId}>
          {toLabel}
        </label>
        <input id={toId} type="date" className={slots.input()} {...toInputProps} />
      </div>
    </div>
  );
};

export { Root };
