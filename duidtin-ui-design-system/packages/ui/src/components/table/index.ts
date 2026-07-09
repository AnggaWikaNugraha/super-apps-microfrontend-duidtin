import { Body, Cell, Column, Header, Row, Root } from "./root";

export const Table = Object.assign(Root, {
  Root,
  Header,
  Column,
  Body,
  Row,
  Cell,
});

export type { TableVariants } from "../../styles/table/table.styles";
