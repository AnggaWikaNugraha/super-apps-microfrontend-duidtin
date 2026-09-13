import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

import type { skeletonVariants } from "../../styles/skeleton/skeleton.styles";

export type SkeletonVariants = VariantProps<typeof skeletonVariants>;

export interface SkeletonRootProps extends ComponentPropsWithRef<"div">, SkeletonVariants {}

export interface SkeletonLinesProps extends ComponentPropsWithRef<"div"> {
  /** Jumlah baris placeholder. Baris terakhir otomatis lebih pendek. */
  lines?: number;
}
