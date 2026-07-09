"use client";

import { Dialog as DialogPrimitive, DialogTrigger, Heading as HeadingPrimitive, Modal as ModalPrimitive, ModalOverlay as ModalOverlayPrimitive } from "react-aria-components";
import { twMerge } from "tailwind-merge";

import { modalVariants } from "../../styles/modal/modal.styles";
import { composeTwRenderProps } from "../../utils";

import type { ModalContentProps, ModalRootProps, ModalSectionProps } from "../../types/modal/modal.types";

const slots = modalVariants();

const Root = (props: ModalRootProps) => <DialogTrigger {...props} />;

const Content = ({ className, children, ...rest }: ModalContentProps) => (
  <ModalOverlayPrimitive className={composeTwRenderProps(undefined, slots.overlay())} isDismissable {...rest}>
    <ModalPrimitive className={composeTwRenderProps(className, slots.modal())}>
      <DialogPrimitive>{children}</DialogPrimitive>
    </ModalPrimitive>
  </ModalOverlayPrimitive>
);

const Heading = ({ className, ...rest }: ModalSectionProps) => <HeadingPrimitive slot="title" className={twMerge(slots.heading(), className)} {...rest} />;

const Body = ({ className, ...rest }: ModalSectionProps) => <div className={twMerge(slots.body(), className)} data-slot="modal-body" {...rest} />;

const Footer = ({ className, ...rest }: ModalSectionProps) => <div className={twMerge(slots.footer(), className)} data-slot="modal-footer" {...rest} />;

export { Root, Content, Heading, Body, Footer };
