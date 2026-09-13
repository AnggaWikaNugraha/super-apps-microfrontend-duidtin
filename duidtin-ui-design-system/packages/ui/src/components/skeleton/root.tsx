"use client";

import { twMerge } from "tailwind-merge";

import { skeletonVariants } from "../../styles/skeleton/skeleton.styles";

import type { SkeletonLinesProps, SkeletonRootProps } from "../../types/skeleton/skeleton.types";

const Root = ({ className, variant, ...rest }: SkeletonRootProps) => (
  <div aria-hidden className={skeletonVariants({ className, variant })} data-slot="skeleton" {...rest} />
);

/** Beberapa baris teks sekaligus — pemakaian paling sering, jadi disediakan. */
const Lines = ({ className, lines = 3, ...rest }: SkeletonLinesProps) => (
  <div className={twMerge("ui-skeleton__lines", className)} data-slot="skeleton-lines" {...rest}>
    {Array.from({ length: lines }, (_, index) => (
      <Root key={index} variant="text" />
    ))}
  </div>
);

export { Lines, Root };
