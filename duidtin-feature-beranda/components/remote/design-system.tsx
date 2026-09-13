import { loadRemote } from "@module-federation/runtime";
import dynamic from "next/dynamic";

import { DESIGN_SYSTEM_REMOTE } from "@/constants/federation";
import { ensureDesignSystemRegistered } from "@/services/federation";

import type { ComponentType, CSSProperties, ReactNode } from "react";

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

interface WithChildren {
  children?: ReactNode;
  className?: string;
}

export interface CardProps extends WithChildren {
  size?: "sm" | "md";
  style?: CSSProperties;
  variant?: "elevated" | "outlined" | "soft";
}

export interface ButtonProps extends WithChildren {
  color?: "primary" | "default";
  isDisabled?: boolean;
  onPress?: () => void;
  size?: "sm" | "md";
  variant?: "solid" | "outline";
}

export interface BadgeProps extends WithChildren {
  color?: "default" | "primary" | "success" | "danger" | "warning" | "info";
  variant?: "solid" | "soft" | "outlined";
}

export interface AlertProps extends WithChildren {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
}

type Compound = Record<string, ComponentType<never>>;

export const Card = remoteComponent<CardProps>("components/card");
export const CardHeader = remoteComponent<WithChildren>(
  "components/card",
  (mod) => (mod.Card as unknown as Compound).Header as ComponentType<WithChildren>,
);
export const CardBody = remoteComponent<WithChildren>(
  "components/card",
  (mod) => (mod.Card as unknown as Compound).Body as ComponentType<WithChildren>,
);

export const Button = remoteComponent<ButtonProps>("components/button");
export const Badge = remoteComponent<BadgeProps>("components/badge");
export const Alert = remoteComponent<AlertProps>("components/alert");

export interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
  variant?: "text" | "heading" | "block" | "circle";
}

export interface SkeletonLinesProps {
  className?: string;
  lines?: number;
}

export const Skeleton = remoteComponent<SkeletonProps>("components/skeleton");
export const SkeletonLines = remoteComponent<SkeletonLinesProps>(
  "components/skeleton",
  (mod) => (mod.Skeleton as unknown as Compound).Lines as ComponentType<SkeletonLinesProps>,
);

export interface EmptyStateProps extends WithChildren {
  size?: "md" | "compact";
  variant?: "default" | "danger";
}

export const EmptyState = remoteComponent<EmptyStateProps>("components/empty-state");
export const EmptyStateIcon = remoteComponent<WithChildren>(
  "components/empty-state",
  (mod) => (mod.EmptyState as unknown as Compound).Icon as ComponentType<WithChildren>,
);
export const EmptyStateTitle = remoteComponent<WithChildren>(
  "components/empty-state",
  (mod) => (mod.EmptyState as unknown as Compound).Title as ComponentType<WithChildren>,
);
export const EmptyStateDescription = remoteComponent<WithChildren>(
  "components/empty-state",
  (mod) => (mod.EmptyState as unknown as Compound).Description as ComponentType<WithChildren>,
);
export const EmptyStateAction = remoteComponent<WithChildren>(
  "components/empty-state",
  (mod) => (mod.EmptyState as unknown as Compound).Action as ComponentType<WithChildren>,
);

export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
  onError?: (error: Error) => void;
  resetKeys?: unknown[];
  title?: string;
}

export const ErrorBoundary = remoteComponent<ErrorBoundaryProps>("components/error-boundary");

export interface DataStateProps {
  children: ReactNode;
  emptyMessage?: string;
  errorDescription?: string;
  errorTitle?: string;
  isEmpty?: boolean;
  isError?: boolean;
  isLoading?: boolean;
  loadingFallback?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}

export const DataState = remoteComponent<DataStateProps>("components/data-state");
