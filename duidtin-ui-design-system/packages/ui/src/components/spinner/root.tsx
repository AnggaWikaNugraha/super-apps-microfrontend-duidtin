"use client";

import { spinnerVariants } from "../../styles/spinner/spinner.styles";
import { SpinnerPrimitive } from "./spinner-primitive";

import type { SpinnerRootProps } from "../../types/spinner/spinner.types";

const Root = ({ className, color, size, ...rest }: SpinnerRootProps) => {
  return (
    <span data-slot="spinner" className={spinnerVariants({ className, color, size })}>
      <SpinnerPrimitive aria-hidden="true" aria-label="Loading" {...rest} />
    </span>
  );
};

export { Root };
