import { loadRemote } from "@module-federation/runtime";
import dynamic from "next/dynamic";

import { DESIGN_SYSTEM_REMOTE } from "@/constants/federation";
import { ensureDesignSystemRegistered } from "@/services/federation";

import type { ComponentType, FormEvent, ReactNode } from "react";

/**
 * Jembatan ke komponen `duidtin-ui-design-system` — sama polanya dengan
 * `duidtin-feature-beranda/components/remote/design-system.tsx`.
 *
 * `pick` dipakai untuk compound component: properti statis (TextField.Label,
 * dst) tidak ikut terbawa waktu `next/dynamic` membungkus modulnya jadi
 * Loadable, jadi tiap bagian dimuat sebagai komponen tersendiri dari expose
 * yang sama.
 */
ensureDesignSystemRegistered();

const remoteComponent = <TProps,>(
  path: string,
  pick?: (mod: Record<string, unknown>) => ComponentType<TProps>,
) =>
  dynamic<TProps>(
    () =>
      loadRemote(`${DESIGN_SYSTEM_REMOTE}/${path}`).then((mod) => ({
        default: pick
          ? pick(mod as Record<string, unknown>)
          : (mod as { default: ComponentType<TProps> }).default,
      })),
    { ssr: false },
  );

type Compound = Record<string, ComponentType<never>>;

interface WithChildren {
  children?: ReactNode;
  className?: string;
}

export interface ButtonProps extends WithChildren {
  color?: "primary" | "default";
  isDisabled?: boolean;
  onPress?: () => void;
  size?: "sm" | "md";
  type?: "button" | "submit";
  variant?: "solid" | "outline";
}

export interface AlertProps extends WithChildren {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
}

export interface TextFieldProps extends WithChildren {
  autoComplete?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  name?: string;
  onChange?: (value: string) => void;
  type?: "text" | "email" | "password";
  value?: string;
}

export interface TextFieldInputProps {
  autoComplete?: string;
  className?: string;
  placeholder?: string;
}

export const Button = remoteComponent<ButtonProps>("components/button");
export const Alert = remoteComponent<AlertProps>("components/alert");

export const TextField = remoteComponent<TextFieldProps>("components/text-field");
export const TextFieldLabel = remoteComponent<WithChildren>(
  "components/text-field",
  (mod) => (mod.TextField as unknown as Compound).Label as ComponentType<WithChildren>,
);
export const TextFieldInput = remoteComponent<TextFieldInputProps>(
  "components/text-field",
  (mod) => (mod.TextField as unknown as Compound).Input as ComponentType<TextFieldInputProps>,
);
export type { FormEvent };
