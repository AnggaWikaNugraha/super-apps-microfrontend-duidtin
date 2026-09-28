import type { TipeProp } from "./inti";

/**
 * Yang TIDAK bisa disimpulkan codegen dari kode komponen.
 *
 * Codegen sudah membaca sendiri: nama varian (dari `styles/<n>/<n>.styles.ts`) dan
 * bagian compound (dari `Object.assign` di `components/<n>/index.ts`). Sisanya —
 * props non-varian, event, dan komponen yang tidak boleh dipecah — ditulis di sini.
 */
export interface Penyesuaian {
  /** Props tambahan di luar varian. */
  props?: Record<string, TipeProp>;
  /** Prop React → nama DOM event. */
  events?: Record<string, string>;
  /** `false` = jangan buat elemen untuk bagian compound-nya. */
  bagian?: false;
  /** Kalau diisi, komponen ini TIDAK dibungkus — nilainya alasan, ikut ke komentar. */
  lewati?: string;
}

/** Alasan yang berulang, ditulis sekali. */
const KONTEKS =
  "bagian-bagiannya bertukar data lewat React Context (id, aria-*, fokus, keyboard). " +
  "Tiap custom element punya React root sendiri dan Context tidak menyeberang antar-root, " +
  "jadi memecahnya jadi elemen terpisah akan memutus aksesibilitasnya. Butuh elemen khusus " +
  "yang merakit bagian-bagiannya di dalam SATU root.";

export const peta: Record<string, Penyesuaian> = {
  button: { props: { isDisabled: "boolean", type: "string" }, events: { onPress: "press" } },

  skeleton: { props: { lines: "number" } },

  "data-state": {
    props: {
      emptyMessage: "string",
      errorDescription: "string",
      errorTitle: "string",
      isEmpty: "boolean",
      isError: "boolean",
      isLoading: "boolean",
    },
    events: { onRetry: "retry" },
  },

  "bar-chart": {
    props: { categoryKey: "string", data: "json", height: "number", series: "json", showLegend: "boolean" },
  },
  "line-chart": {
    props: { categoryKey: "string", data: "json", height: "number", series: "json", showLegend: "boolean" },
  },
  "pie-chart": { props: { data: "json", height: "number", showLegend: "boolean" } },

  // —— belum dibungkus, dengan alasannya masing-masing ——
  select: { lewati: KONTEKS },
  tabs: { lewati: KONTEKS },
  table: { lewati: KONTEKS },
  "text-field": { lewati: KONTEKS },
  modal: { lewati: `${KONTEKS} Ditambah portal: isinya dirender ke luar pohon DOM elemen.` },
  "date-range-picker": { lewati: `${KONTEKS} Ditambah popover kalender yang memakai portal.` },
  "error-boundary": {
    lewati:
      "Error boundary hanya menangkap error di dalam pohon React-nya sendiri. Anak yang " +
      "di-slot lewat light DOM bukan bagian pohon itu, jadi elemennya akan terlihat bekerja " +
      "padahal tidak menangkap apa pun.",
  },
};
