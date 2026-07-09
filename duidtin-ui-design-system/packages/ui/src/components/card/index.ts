import { Body, Footer, Header, Root } from "./root";

export const Card = Object.assign(Root, {
  Root,
  Header,
  Body,
  Footer,
});

export type { CardVariants } from "../../styles/card/card.styles";
