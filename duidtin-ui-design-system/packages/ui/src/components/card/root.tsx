"use client";

import { twMerge } from "tailwind-merge";

import { cardVariants } from "../../styles/card/card.styles";

import type { CardRootProps, CardSectionProps } from "../../types/card/card.types";

const Root = ({ className, size, variant, ...rest }: CardRootProps) => {
  return <div className={twMerge(cardVariants({ size, variant }), className)} data-slot="card" {...rest} />;
};

const Header = ({ className, ...rest }: CardSectionProps) => <div className={twMerge("ui-card__header", className)} data-slot="card-header" {...rest} />;

const Body = ({ className, ...rest }: CardSectionProps) => <div className={twMerge("ui-card__body", className)} data-slot="card-body" {...rest} />;

const Footer = ({ className, ...rest }: CardSectionProps) => <div className={twMerge("ui-card__footer", className)} data-slot="card-footer" {...rest} />;

export { Root, Header, Body, Footer };
