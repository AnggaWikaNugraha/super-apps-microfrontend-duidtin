import type { ComponentPropsWithRef } from "react";
import type { DialogProps, DialogTriggerProps, ModalOverlayProps } from "react-aria-components";

export interface ModalRootProps extends DialogTriggerProps {}

export interface ModalContentProps extends Omit<ModalOverlayProps, "children" | "className"> {
  className?: string;
  children?: DialogProps["children"];
}

export type ModalSectionProps = ComponentPropsWithRef<"div">;
