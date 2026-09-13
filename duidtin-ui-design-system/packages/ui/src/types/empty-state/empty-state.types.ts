import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

import type { emptyStateVariants } from "../../styles/empty-state/empty-state.styles";

export type EmptyStateVariants = VariantProps<typeof emptyStateVariants>;

export interface EmptyStateRootProps extends ComponentPropsWithRef<"div">, EmptyStateVariants {}

export type EmptyStateSectionProps = ComponentPropsWithRef<"div">;
