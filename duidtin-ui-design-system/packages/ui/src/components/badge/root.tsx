"use client";

import { badgeVariants } from "../../styles/badge/badge.styles";

import type { BadgeRootProps } from "../../types/badge/badge.types";

const Root = ({ className, color, variant, ...rest }: BadgeRootProps) => {
  return <span className={badgeVariants({ className, color, variant })} data-slot="badge" {...rest} />;
};

export { Root };
