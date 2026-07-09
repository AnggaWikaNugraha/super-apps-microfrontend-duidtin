"use client";

import { twMerge } from "tailwind-merge";

import { alertVariants } from "../../styles/alert/alert.styles";

import type { AlertRootProps, AlertSectionProps } from "../../types/alert/alert.types";

const Root = ({ className, variant, ...rest }: AlertRootProps) => {
  return <div className={alertVariants({ className, variant })} data-slot="alert" role="alert" {...rest} />;
};

const Icon = ({ className, ...rest }: AlertSectionProps) => <div className={twMerge("ui-alert__icon", className)} data-slot="alert-icon" {...rest} />;

const Content = ({ className, ...rest }: AlertSectionProps) => <div className={twMerge("ui-alert__content", className)} data-slot="alert-content" {...rest} />;

const Title = ({ className, ...rest }: AlertSectionProps) => <div className={twMerge("ui-alert__title", className)} data-slot="alert-title" {...rest} />;

const Description = ({ className, ...rest }: AlertSectionProps) => <div className={twMerge("ui-alert__description", className)} data-slot="alert-description" {...rest} />;

export { Root, Icon, Content, Title, Description };
