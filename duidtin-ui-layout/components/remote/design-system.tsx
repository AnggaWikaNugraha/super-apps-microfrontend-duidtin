import { loadRemote } from "@module-federation/runtime";
import dynamic from "next/dynamic";

import { DESIGN_SYSTEM_REMOTE } from "@/constants/federation";

import type { ComponentType, ReactNode } from "react";

type RemoteModule<TProps> = { default: ComponentType<TProps> };

/**
 * Jembatan ke komponen `duidtin-ui-design-system`. Repo ini remote buat host,
 * tapi sekaligus konsumen remote lain — komponennya di-fetch runtime, jadi harus
 * lewat next/dynamic (`ssr: false`), bukan import biasa.
 */
const loadDesignSystemComponent = <TProps,>(name: string) =>
  loadRemote(`${DESIGN_SYSTEM_REMOTE}/components/${name}`) as Promise<RemoteModule<TProps>>;

export interface RemoteButtonProps {
  children?: ReactNode;
  className?: string;
  color?: "primary" | "default";
  isDisabled?: boolean;
  onPress?: () => void;
  size?: "sm" | "md";
  variant?: "solid" | "outline";
}

export interface RemoteBadgeProps {
  children?: ReactNode;
  className?: string;
  color?: "default" | "primary" | "success" | "danger" | "warning" | "info";
  variant?: "solid" | "soft" | "outlined";
}

export const Button = dynamic<RemoteButtonProps>(
  () => loadDesignSystemComponent<RemoteButtonProps>("button"),
  { ssr: false },
);

export const Badge = dynamic<RemoteBadgeProps>(
  () => loadDesignSystemComponent<RemoteBadgeProps>("badge"),
  { ssr: false },
);
