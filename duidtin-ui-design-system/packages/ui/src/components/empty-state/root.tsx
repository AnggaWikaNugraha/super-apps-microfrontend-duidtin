"use client";

import { twMerge } from "tailwind-merge";

import { emptyStateVariants } from "../../styles/empty-state/empty-state.styles";

import type {
  EmptyStateRootProps,
  EmptyStateSectionProps,
} from "../../types/empty-state/empty-state.types";

const Root = ({ className, size, variant, ...rest }: EmptyStateRootProps) => (
  <div className={emptyStateVariants({ className, size, variant })} data-slot="empty-state" {...rest} />
);

const Icon = ({ className, ...rest }: EmptyStateSectionProps) => (
  <div className={twMerge("ui-empty-state__icon", className)} data-slot="empty-state-icon" {...rest} />
);

const Title = ({ className, ...rest }: EmptyStateSectionProps) => (
  <div className={twMerge("ui-empty-state__title", className)} data-slot="empty-state-title" {...rest} />
);

const Description = ({ className, ...rest }: EmptyStateSectionProps) => (
  <div
    className={twMerge("ui-empty-state__description", className)}
    data-slot="empty-state-description"
    {...rest}
  />
);

const Action = ({ className, ...rest }: EmptyStateSectionProps) => (
  <div className={twMerge("ui-empty-state__action", className)} data-slot="empty-state-action" {...rest} />
);

export { Action, Description, Icon, Root, Title };
