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
  /** Props untuk bagian compound-nya, mis. `{ Lines: { lines: "number" } }`. */
  propsBagian?: Record<string, Record<string, TipeProp>>;
  /** Prop React → nama DOM event. */
  events?: Record<string, string>;
  /** `false` = jangan buat elemen untuk bagian compound-nya. */
  bagian?: false;
  /** Kalau diisi, komponen ini TIDAK dibungkus — nilainya alasan, ikut ke komentar. */
  lewati?: string;
  /**
   * Komponen compound yang bagiannya tidak boleh dipecah: dirakit tangan di
   * `<n>/rakitan.tsx` jadi SATU elemen dengan SATU React root. Nilainya ringkasan
   * susunannya, ikut ke komentar berkas hasil generate.
   *
   * Codegen hanya menulis `index.ts` yang mengimpor `rakitan.tsx` — berkas rakitan
   * sendiri tidak pernah ditimpa.
   */
  rakit?: string;
}

/** Alasan yang berulang, ditulis sekali. */
const KONTEKS =
  "bagian-bagiannya bertukar data lewat React Context (id, aria-*, fokus, keyboard), jadi " +
  "semuanya dirakit di dalam SATU React root — bukan satu elemen per bagian.";

export const peta: Record<string, Penyesuaian> = {
  button: { props: { isDisabled: "boolean", type: "string" }, events: { onPress: "press" } },

  // `lines` milik Skeleton.Lines, bukan Skeleton — Root cuma merender satu balok.
  skeleton: { propsBagian: { Lines: { lines: "number" } } },

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

  // —— compound: dirakit tangan jadi satu elemen, lihat <n>/rakitan.tsx ——
  "text-field": {
    rakit: `${KONTEKS} Susunannya label → input → deskripsi → pesan error.`,
    props: {
      description: "string",
      errorMessage: "string",
      isDisabled: "boolean",
      isInvalid: "boolean",
      isRequired: "boolean",
      label: "string",
      name: "string",
      placeholder: "string",
      type: "string",
      value: "string",
    },
    events: { onInput: "dtn-input", onChange: "dtn-change" },
  },

  select: {
    rakit: `${KONTEKS} Pilihannya datang dari atribut \`items\` (JSON), bukan dari elemen anak.`,
    props: {
      isDisabled: "boolean",
      isRequired: "boolean",
      items: "json",
      label: "string",
      name: "string",
      placeholder: "string",
      value: "string",
    },
    events: { onChange: "dtn-change" },
  },

  modal: {
    rakit: `${KONTEKS} Dibuka lewat atribut \`is-open\`, bukan lewat tombol pemicu di dalamnya; isinya datang dari anak light DOM.`,
    props: { heading: "string", isDismissable: "boolean", isOpen: "boolean" },
    events: { onClose: "dtn-close" },
  },

  tabs: {
    rakit: `${KONTEKS} Daftar tab dari atribut \`items\` (JSON); isi panel yang sedang aktif datang dari anak light DOM.`,
    props: { items: "json", value: "string" },
    events: { onChange: "dtn-change" },
  },

  table: {
    rakit: `${KONTEKS} Kolom dan baris datang dari atribut \`columns\` dan \`rows\` (JSON) — isi sel sebatas teks.`,
    props: { columns: "json", rows: "json", size: "string" },
  },

  "date-range-picker": {
    // Komponennya sebenarnya BUKAN compound dan tidak menyentuh Context sama
    // sekali — isinya dua <input type="date"> biasa. Tetap dirakit karena
    // props-nya berupa objek (`fromInputProps`) yang tidak bisa jadi atribut.
    rakit: "nilainya diratakan jadi atribut `from` dan `to`, karena props aslinya berupa objek props input.",
    props: { from: "string", fromLabel: "string", name: "string", to: "string", toLabel: "string" },
    events: { onChange: "dtn-change" },
  },
  // —— satu-satunya yang tetap tidak dibungkus ——
  "error-boundary": {
    lewati:
      "Error boundary hanya menangkap error di dalam pohon React-nya sendiri. Anak yang " +
      "di-slot lewat light DOM bukan bagian pohon itu, jadi elemennya akan terlihat bekerja " +
      "padahal tidak menangkap apa pun.",
  },
};
