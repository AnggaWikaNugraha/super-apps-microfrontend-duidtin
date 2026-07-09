import { Body, Footer, Header, Root } from "./root";

export const Card = Object.assign(Root, {
  Root,
  Header,
  Body,
  Footer,
});

export type { CardRootProps, CardSectionProps, CardVariants } from "../../types/card/card.types";
