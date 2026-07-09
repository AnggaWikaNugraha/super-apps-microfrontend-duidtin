import { Body, Content, Footer, Heading, Root } from "./root";

export const Modal = Object.assign(Root, {
  Root,
  Content,
  Heading,
  Body,
  Footer,
});

export type { ModalContentProps, ModalRootProps, ModalSectionProps } from "../../types/modal/modal.types";
