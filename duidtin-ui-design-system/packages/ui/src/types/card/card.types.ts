import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

import type { cardVariants } from "../../styles/card/card.styles";

export type CardVariants = VariantProps<typeof cardVariants>;

export interface CardRootProps extends ComponentPropsWithRef<"div">, CardVariants {}

export type CardSectionProps = ComponentPropsWithRef<"div">;
