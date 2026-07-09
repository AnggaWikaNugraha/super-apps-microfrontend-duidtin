import type { ComponentPropsWithRef } from "react";

export interface DateRangePickerRootProps {
  className?: string;
  fromLabel?: string;
  toLabel?: string;
  fromInputProps?: Omit<ComponentPropsWithRef<"input">, "type" | "id">;
  toInputProps?: Omit<ComponentPropsWithRef<"input">, "type" | "id">;
}
