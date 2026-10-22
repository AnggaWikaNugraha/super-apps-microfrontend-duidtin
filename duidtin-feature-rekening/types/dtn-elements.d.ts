import type { DefineComponent } from "vue";

/**
 * Tipe untuk elemen `<dtn-*>` milik design-system.
 *
 * Custom element tidak punya tipe otomatis: tanpa berkas ini `vue-tsc` diam saja
 * walaupun atributnya salah tulis. Design-system punya padanannya untuk konsumen
 * React (`component-wrapper/utils/elemen.d.ts`, hasil generate), tapi bentuknya
 * `JSX.IntrinsicElements` — tidak berlaku di template Vue.
 *
 * Daftarnya manual, dan sengaja cuma elemen yang benar-benar dipakai repo ini.
 * Nilai variannya disalin dari `src/styles/<n>/<n>.styles.ts` di design-system;
 * kalau di sana bertambah, berkas ini yang harus menyusul.
 */
type CustomElement<TProps = Record<string, never>> = DefineComponent<TProps>;

interface SelectOption {
  id: string;
  label: string;
}

declare module "vue" {
  interface GlobalComponents {
    "dtn-alert": CustomElement<{ variant?: "default" | "primary" | "success" | "warning" | "danger" | "info" }>;

    "dtn-badge": CustomElement<{
      color?: "default" | "primary" | "success" | "danger" | "warning" | "info";
      variant?: "solid" | "soft" | "outlined";
    }>;

    "dtn-button": CustomElement<{
      color?: "primary" | "default";
      isDisabled?: boolean;
      size?: "sm" | "md";
      type?: string;
      variant?: "solid" | "outline";
    }>;

    "dtn-card": CustomElement<{ size?: "sm" | "md" | "lg"; variant?: "elevated" | "outlined" | "soft" }>;
    "dtn-card-header": CustomElement;
    "dtn-card-body": CustomElement;
    "dtn-card-footer": CustomElement;

    "dtn-data-state": CustomElement<{
      emptyMessage?: string;
      errorDescription?: string;
      errorTitle?: string;
      isEmpty?: boolean;
      isError?: boolean;
      isLoading?: boolean;
    }>;

    "dtn-skeleton": CustomElement<{ variant?: "text" | "heading" | "block" | "circle" }>;
    "dtn-skeleton-lines": CustomElement<{ lines?: number }>;

    /* ── elemen rakitan: seluruh compound dalam satu React root ───────────── */

    "dtn-modal": CustomElement<{ heading?: string; isDismissable?: boolean; isOpen?: boolean }>;

    "dtn-table": CustomElement<{
      columns?: { id: string; label: string; isRowHeader?: boolean }[];
      rows?: Record<string, string | number>[];
      size?: "sm" | "md" | "lg";
    }>;

    "dtn-tabs": CustomElement<{ items?: SelectOption[]; value?: string }>;

    "dtn-text-field": CustomElement<{
      description?: string;
      errorMessage?: string;
      isDisabled?: boolean;
      isInvalid?: boolean;
      isRequired?: boolean;
      label?: string;
      name?: string;
      placeholder?: string;
      type?: string;
      value?: string;
    }>;

    "dtn-select": CustomElement<{
      isDisabled?: boolean;
      isRequired?: boolean;
      items?: SelectOption[];
      label?: string;
      name?: string;
      placeholder?: string;
      value?: string;
    }>;

    "dtn-date-range-picker": CustomElement<{
      from?: string;
      fromLabel?: string;
      name?: string;
      to?: string;
      toLabel?: string;
    }>;
  }
}
