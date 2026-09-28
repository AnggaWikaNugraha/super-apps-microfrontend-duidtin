import { loadRemote } from "@module-federation/runtime";
import dynamic from "next/dynamic";

import { DESIGN_SYSTEM_REMOTE } from "@/constants/federation";
import { ensureDesignSystemRegistered } from "@/services/federation";

import type { Alert as AlertAsli } from "@mf-types/duidtin_ui_design_system/components/alert";
import type { Badge as BadgeAsli } from "@mf-types/duidtin_ui_design_system/components/badge";
import type { Button as ButtonAsli } from "@mf-types/duidtin_ui_design_system/components/button";
import type { Card as CardAsli } from "@mf-types/duidtin_ui_design_system/components/card";
import type { DataState as DataStateAsli } from "@mf-types/duidtin_ui_design_system/components/data-state";
import type { EmptyState as EmptyStateAsli } from "@mf-types/duidtin_ui_design_system/components/empty-state";
import type { ErrorBoundary as ErrorBoundaryAsli } from "@mf-types/duidtin_ui_design_system/components/error-boundary";
import type { Skeleton as SkeletonAsli } from "@mf-types/duidtin_ui_design_system/components/skeleton";
import type { ComponentProps, ComponentType, ReactNode } from "react";

/**
 * Jembatan ke komponen `duidtin-ui-design-system`.
 *
 * Repo ini remote buat host, tapi sekaligus KONSUMEN remote lain — dan lintas
 * versi MF pula: beranda pakai MF 2.x, design-system masih 0.24.1.
 *
 * `pick` dipakai buat compound component (Card.Header, dst) — properti statis
 * nggak ikut terbawa waktu next/dynamic membungkus modulnya jadi Loadable.
 */
// Dipanggil di module scope, bukan di dalam komponen: berkas ini di-import
// container beranda, jadi baris ini pasti jalan baik waktu dirender host maupun
// waktu repo ini dibuka sendiri.
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

/**
 * Props diambil dari TIPE ASLI design-system (`@mf-types/`, hasil `bun run tipe`),
 * bukan ditulis ulang. Salinan tangan diam-diam melenceng begitu design-system
 * berubah — varian baru tidak ikut, varian yang dihapus tetap "boleh".
 */
export type CardProps = ComponentProps<typeof CardAsli>;
export type CardHeaderProps = ComponentProps<typeof CardAsli.Header>;
export type CardBodyProps = ComponentProps<typeof CardAsli.Body>;

export type ButtonProps = ComponentProps<typeof ButtonAsli>;

export type BadgeProps = ComponentProps<typeof BadgeAsli>;

export type AlertProps = ComponentProps<typeof AlertAsli>;

type Compound = Record<string, ComponentType<never>>;

export const Card = remoteComponent<CardProps>("components/card");
export const CardHeader = remoteComponent<CardHeaderProps>(
  "components/card",
  (mod) => (mod.Card as unknown as Compound).Header as ComponentType<CardHeaderProps>,
);
export const CardBody = remoteComponent<CardBodyProps>(
  "components/card",
  (mod) => (mod.Card as unknown as Compound).Body as ComponentType<CardBodyProps>,
);

export const Button = remoteComponent<ButtonProps>("components/button");
export const Badge = remoteComponent<BadgeProps>("components/badge");
export const Alert = remoteComponent<AlertProps>("components/alert");

export type SkeletonProps = ComponentProps<typeof SkeletonAsli>;

export type SkeletonLinesProps = ComponentProps<typeof SkeletonAsli.Lines>;

export const Skeleton = remoteComponent<SkeletonProps>("components/skeleton");
export const SkeletonLines = remoteComponent<SkeletonLinesProps>(
  "components/skeleton",
  (mod) => (mod.Skeleton as unknown as Compound).Lines as ComponentType<SkeletonLinesProps>,
);

export type EmptyStateProps = ComponentProps<typeof EmptyStateAsli>;
export type EmptyStateIconProps = ComponentProps<typeof EmptyStateAsli.Icon>;
export type EmptyStateTitleProps = ComponentProps<typeof EmptyStateAsli.Title>;
export type EmptyStateDescriptionProps = ComponentProps<typeof EmptyStateAsli.Description>;
export type EmptyStateActionProps = ComponentProps<typeof EmptyStateAsli.Action>;

export const EmptyState = remoteComponent<EmptyStateProps>("components/empty-state");
export const EmptyStateIcon = remoteComponent<EmptyStateIconProps>(
  "components/empty-state",
  (mod) => (mod.EmptyState as unknown as Compound).Icon as ComponentType<EmptyStateIconProps>,
);
export const EmptyStateTitle = remoteComponent<EmptyStateTitleProps>(
  "components/empty-state",
  (mod) => (mod.EmptyState as unknown as Compound).Title as ComponentType<EmptyStateTitleProps>,
);
export const EmptyStateDescription = remoteComponent<EmptyStateDescriptionProps>(
  "components/empty-state",
  (mod) => (mod.EmptyState as unknown as Compound).Description as ComponentType<EmptyStateDescriptionProps>,
);
export const EmptyStateAction = remoteComponent<EmptyStateActionProps>(
  "components/empty-state",
  (mod) => (mod.EmptyState as unknown as Compound).Action as ComponentType<EmptyStateActionProps>,
);

export type ErrorBoundaryProps = ComponentProps<typeof ErrorBoundaryAsli>;

export const ErrorBoundary = remoteComponent<ErrorBoundaryProps>("components/error-boundary");

export type DataStateProps = ComponentProps<typeof DataStateAsli>;

export const DataState = remoteComponent<DataStateProps>("components/data-state");
