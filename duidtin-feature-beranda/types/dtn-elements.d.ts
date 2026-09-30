import type { DefineComponent } from "vue";

/**
 * Tipe untuk elemen `<dtn-*>` milik design-system.
 *
 * Custom element tidak punya tipe otomatis: tanpa berkas ini `vue-tsc` diam saja
 * walaupun atributnya salah tulis. Design-system punya padanannya untuk konsumen
 * React (`component-wrapper/utils/elemen.d.ts`, hasil generate), tapi tipe itu
 * berbentuk `JSX.IntrinsicElements` — tidak berlaku di template Vue.
 *
 * DAFTARNYA MANUAL, dan sengaja cuma elemen yang benar-benar dipakai beranda.
 * Nilai variannya disalin dari `src/styles/<n>/<n>.styles.ts` di design-system;
 * kalau di sana bertambah, berkas ini yang harus menyusul.
 *
 * Tipe atributnya ditulis apa adanya (`boolean`, `number`), bukan string: Vue
 * yang mengubahnya jadi atribut, dan pembungkus di design-system yang
 * menafsirkannya balik.
 */
type Elemen<TProps = Record<string, never>> = DefineComponent<TProps>;

declare module "vue" {
  interface GlobalComponents {
    "dtn-alert": Elemen<{ variant?: "default" | "primary" | "success" | "warning" | "danger" | "info" }>;

    "dtn-badge": Elemen<{
      color?: "default" | "primary" | "success" | "danger" | "warning" | "info";
      variant?: "solid" | "soft" | "outlined";
    }>;

    "dtn-button": Elemen<{
      color?: "primary" | "default";
      isDisabled?: boolean;
      size?: "sm" | "md";
      type?: string;
      variant?: "solid" | "outline";
    }>;

    "dtn-card": Elemen<{ size?: "sm" | "md" | "lg"; variant?: "elevated" | "outlined" | "soft" }>;
    "dtn-card-header": Elemen;
    "dtn-card-body": Elemen;
    "dtn-card-footer": Elemen;

    "dtn-data-state": Elemen<{
      emptyMessage?: string;
      errorDescription?: string;
      errorTitle?: string;
      isEmpty?: boolean;
      isError?: boolean;
      isLoading?: boolean;
    }>;

    "dtn-skeleton": Elemen<{ variant?: "text" | "heading" | "block" | "circle" }>;
    "dtn-skeleton-lines": Elemen<{ lines?: number }>;
  }
}
