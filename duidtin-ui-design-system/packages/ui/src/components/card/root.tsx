"use client";

import { twMerge } from "tailwind-merge";

import { cardVariants } from "../../styles/card/card.styles";

import type { ComponentPropsWithRef } from "react";
import type { CardVariants } from "../../styles/card/card.styles";

interface RootProps extends ComponentPropsWithRef<"div">, CardVariants {}

const Root = ({ className, size, variant, ...rest }: RootProps) => {
  return <div className={twMerge(cardVariants({ size, variant }), className)} data-slot="card" {...rest} />;
};

type SectionProps = ComponentPropsWithRef<"div">;

const Header = ({ className, ...rest }: SectionProps) => <div className={twMerge("ui-card__header", className)} data-slot="card-header" {...rest} />;

const Body = ({ className, ...rest }: SectionProps) => <div className={twMerge("ui-card__body", className)} data-slot="card-body" {...rest} />;

const Footer = ({ className, ...rest }: SectionProps) => <div className={twMerge("ui-card__footer", className)} data-slot="card-footer" {...rest} />;

export { Root, Header, Body, Footer };
