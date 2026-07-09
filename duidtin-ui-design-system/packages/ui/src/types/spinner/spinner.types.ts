import type { SVGProps } from "react";
import type { VariantProps } from "tailwind-variants";

import type { spinnerVariants } from "../../styles/spinner/spinner.styles";

export type SpinnerVariants = VariantProps<typeof spinnerVariants>;

export interface SpinnerRootProps extends Omit<SVGProps<SVGSVGElement>, "color">, SpinnerVariants {}
