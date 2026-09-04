import { loadRemote } from "@module-federation/runtime";
import dynamic from "next/dynamic";

import type { ComponentType, ReactNode } from "react";

/**
 * Jembatan ke komponen remote.
 *
 * `ssr: false` wajib: modulnya di-fetch runtime dari origin lain, jadi nggak ada
 * wujudnya waktu Next prerender di server.
 *
 * `pick` dipakai buat modul yang komponennya bukan di `default` — misal `Card`
 * yang punya sub-komponen (Card.Header, Card.Body) sebagai properti.
 */
const remoteComponent = <TProps,>(
  path: string,
  pick?: (mod: Record<string, unknown>) => ComponentType<TProps>,
) =>
  dynamic<TProps>(
    () =>
      loadRemote(path).then((mod) => ({
        default: pick
          ? pick(mod as Record<string, unknown>)
          : (mod as { default: ComponentType<TProps> }).default,
      })),
    { ssr: false },
  );

/* ---------------------------------------------------------------------------
 * duidtin_ui_layout — layout bersama, membungkus konten tiap halaman (FASE 3)
 * ------------------------------------------------------------------------- */

export interface NavItem {
  href: string;
  label: string;
}

export interface DefaultLayoutProps {
  activePath?: string;
  children?: ReactNode;
  navItems?: NavItem[];
  onLogout?: () => void;
  userName?: string;
}

export const DefaultLayout = remoteComponent<DefaultLayoutProps>("duidtin_ui_layout/default");

/* ---------------------------------------------------------------------------
 * duidtin_ui_design_system — dikonsumsi LANGSUNG oleh host, bukan cuma lewat
 * layout. Ini yang membuktikan share scope react-nya tembus ke dua arah:
 * host → design-system, dan host → layout → design-system.
 * ------------------------------------------------------------------------- */

const DESIGN_SYSTEM = "duidtin_ui_design_system";

export interface ButtonProps {
  children?: ReactNode;
  className?: string;
  color?: "primary" | "default";
  isDisabled?: boolean;
  onPress?: () => void;
  size?: "sm" | "md";
  variant?: "solid" | "outline";
}

export interface CardProps {
  children?: ReactNode;
  className?: string;
  size?: "sm" | "md";
  style?: React.CSSProperties;
  variant?: "elevated" | "outlined" | "soft";
}

export interface CardSectionProps {
  children?: ReactNode;
  className?: string;
}

type CardModule = { Card: ComponentType<CardProps> & Record<string, ComponentType<never>> };

export const Button = remoteComponent<ButtonProps>(`${DESIGN_SYSTEM}/components/button`);

export const Card = remoteComponent<CardProps>(`${DESIGN_SYSTEM}/components/card`);

export const CardHeader = remoteComponent<CardSectionProps>(
  `${DESIGN_SYSTEM}/components/card`,
  (mod) => (mod as unknown as CardModule).Card.Header as ComponentType<CardSectionProps>,
);

export const CardBody = remoteComponent<CardSectionProps>(
  `${DESIGN_SYSTEM}/components/card`,
  (mod) => (mod as unknown as CardModule).Card.Body as ComponentType<CardSectionProps>,
);
