import { loadRemote } from "@module-federation/runtime";
import dynamic from "next/dynamic";

import { DESIGN_SYSTEM_REMOTE } from "@/constants/federation";

import type { Badge as BadgeAsli } from "@mf-types/duidtin_ui_design_system/components/badge";
import type { Button as ButtonAsli } from "@mf-types/duidtin_ui_design_system/components/button";
import type { ComponentProps, ComponentType } from "react";

type RemoteModule<TProps> = { default: ComponentType<TProps> };

/**
 * Jembatan ke komponen `duidtin-ui-design-system`. Repo ini remote buat host,
 * tapi sekaligus konsumen remote lain — komponennya di-fetch runtime, jadi harus
 * lewat next/dynamic (`ssr: false`), bukan import biasa.
 */
const loadDesignSystemComponent = <TProps,>(name: string) =>
  loadRemote(`${DESIGN_SYSTEM_REMOTE}/components/${name}`) as Promise<RemoteModule<TProps>>;

/**
 * Props diambil dari TIPE ASLI design-system, bukan ditulis ulang.
 *
 * `@mf-types/` itu hasil unduhan arsip tipe milik remote (`bun run tipe`, otomatis
 * lewat `predev`/`prebuild`). Sebelumnya props di sini disalin tangan, dan salinan
 * seperti itu diam-diam melenceng begitu design-system berubah — mis. varian baru
 * ditambah, di sini tidak ikut.
 */
export type RemoteButtonProps = ComponentProps<typeof ButtonAsli>;

export type RemoteBadgeProps = ComponentProps<typeof BadgeAsli>;

export const Button = dynamic<RemoteButtonProps>(
  () => loadDesignSystemComponent<RemoteButtonProps>("button"),
  { ssr: false },
);

export const Badge = dynamic<RemoteBadgeProps>(
  () => loadDesignSystemComponent<RemoteBadgeProps>("badge"),
  { ssr: false },
);
