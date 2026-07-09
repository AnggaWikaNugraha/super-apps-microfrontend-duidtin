"use client";

import { badgeVariants } from "../../styles/badge/badge.styles";

import type { ComponentPropsWithRef } from "react";
import type { BadgeVariants } from "../../styles/badge/badge.styles";

interface RootProps extends Omit<ComponentPropsWithRef<"span">, "color">, BadgeVariants {}

const Root = ({ className, color, variant, ...rest }: RootProps) => {
  return <span className={badgeVariants({ className, color, variant })} data-slot="badge" {...rest} />;
};

export { Root };
