import type { ButtonProps as ButtonPrimitiveProps } from "react-aria-components";
import type { VariantProps } from "tailwind-variants";

import type { buttonVariants } from "../../styles/button/button.styles";

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export interface ButtonRootProps extends ButtonPrimitiveProps, ButtonVariants {}
