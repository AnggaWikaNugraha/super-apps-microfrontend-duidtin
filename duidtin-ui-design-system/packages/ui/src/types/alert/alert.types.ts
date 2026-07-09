import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

import type { alertVariants } from "../../styles/alert/alert.styles";

export type AlertVariants = VariantProps<typeof alertVariants>;

export interface AlertRootProps extends ComponentPropsWithRef<"div">, AlertVariants {}

export type AlertSectionProps = ComponentPropsWithRef<"div">;
