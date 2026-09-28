import { loadRemote } from "@module-federation/runtime";
import dynamic from "next/dynamic";

import { DESIGN_SYSTEM_REMOTE } from "@/constants/federation";
import { ensureDesignSystemRegistered } from "@/services/federation";

import type { Alert as AlertAsli } from "@mf-types/duidtin_ui_design_system/components/alert";
import type { Button as ButtonAsli } from "@mf-types/duidtin_ui_design_system/components/button";
import type { Modal as ModalAsli } from "@mf-types/duidtin_ui_design_system/components/modal";
import type { TextField as TextFieldAsli } from "@mf-types/duidtin_ui_design_system/components/text-field";
import type { ComponentProps, ComponentType, FormEvent, ReactNode } from "react";

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

/**
 * Props diambil dari TIPE ASLI design-system (`@mf-types/`, hasil `bun run tipe`),
 * bukan ditulis ulang. Salinan tangan diam-diam melenceng begitu design-system
 * berubah — varian baru tidak ikut, varian yang dihapus tetap "boleh".
 */
export type ButtonProps = ComponentProps<typeof ButtonAsli>;

export type AlertProps = ComponentProps<typeof AlertAsli>;

export type TextFieldProps = ComponentProps<typeof TextFieldAsli>;

export type TextFieldLabelProps = ComponentProps<typeof TextFieldAsli.Label>;

export type TextFieldInputProps = ComponentProps<typeof TextFieldAsli.Input>;

export type ModalContentProps = ComponentProps<typeof ModalAsli.Content>;

export type ModalSectionProps = ComponentProps<typeof ModalAsli.Heading>;

export const Button = remoteComponent<ButtonProps>("components/button");
export const Alert = remoteComponent<AlertProps>("components/alert");

export const ModalContent = remoteComponent<ModalContentProps>(
  "components/modal",
  (mod) => (mod.Modal as unknown as Compound).Content as ComponentType<ModalContentProps>,
);
export const ModalHeading = remoteComponent<WithChildren>(
  "components/modal",
  (mod) => (mod.Modal as unknown as Compound).Heading as ComponentType<WithChildren>,
);
export const ModalBody = remoteComponent<WithChildren>(
  "components/modal",
  (mod) => (mod.Modal as unknown as Compound).Body as ComponentType<WithChildren>,
);
export const ModalFooter = remoteComponent<WithChildren>(
  "components/modal",
  (mod) => (mod.Modal as unknown as Compound).Footer as ComponentType<WithChildren>,
);

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
