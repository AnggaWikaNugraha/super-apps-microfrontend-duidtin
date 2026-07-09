import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

import type { badgeVariants } from "../../styles/badge/badge.styles";

export type BadgeVariants = VariantProps<typeof badgeVariants>;

export interface BadgeRootProps extends Omit<ComponentPropsWithRef<"span">, "color">, BadgeVariants {}
