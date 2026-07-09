"use client";

import { Button as ButtonPrimitive } from "react-aria-components";

import { buttonVariants } from "../../styles/button/button.styles";
import { composeTwRenderProps } from "../../utils";

import type { ButtonRootProps } from "../../types/button/button.types";

const Root = ({ children, className, variant, color, size, ...rest }: ButtonRootProps) => {
  const classNames = buttonVariants({ variant, color, size });
  return (
    <ButtonPrimitive className={composeTwRenderProps(className, classNames)} data-slot="button" data-variant={variant ?? "solid"} data-color={color ?? "primary"} {...rest}>
      {children}
    </ButtonPrimitive>
  );
};

export { Root };
