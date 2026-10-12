// DITULIS TANGAN — berkas ini TIDAK ikut `bun run gen:wrapper`.
// Yang di-generate cuma `index.ts` di sebelahnya, yang mengimpor berkas ini.

import { DateRangePicker } from "../../components/date-range-picker";
import { buatElemenRakitan } from "../utils/inti";
import { peta } from "../utils/peta";

interface Props {
  from?: string;
  fromLabel?: string;
  name?: string;
  to?: string;
  toLabel?: string;
}

/**
 * Satu-satunya di antara enam elemen rakitan yang BUKAN karena React Context.
 *
 * Komponennya tidak compound dan tidak menyentuh Context sama sekali — isinya
 * dua `<input type="date">` biasa. Yang membuatnya tidak bisa dibungkus cara
 * biasa: props-nya `fromInputProps` dan `toInputProps`, dua OBJEK props input.
 * Objek tidak punya bentuk atribut yang masuk akal, jadi di sini diratakan jadi
 * `from` dan `to`.
 *
 * (Catatan: `peta.ts` dulu menuliskan alasan "popover kalender yang memakai
 * portal". Itu keliru — tidak ada popover di komponennya.)
 *
 * `change` membawa kedua tanggal sekaligus, karena rentang yang cuma separuh
 * terisi hampir selalu tidak berguna bagi yang mendengarkan:
 *   detail = { from: "2026-01-01", to: "2026-01-31" }
 */
buatElemenRakitan(
  "dtn-date-range-picker",
  ({ from, fromLabel, name, to, toLabel }: Props, { kirim }) => {
    const ubah = (bagian: "from" | "to") => (e: { target: HTMLInputElement }) =>
      kirim("dtn-change", { from, to, [bagian]: e.target.value });

    return (
      <DateRangePicker
        fromLabel={fromLabel}
        toLabel={toLabel}
        fromInputProps={{ defaultValue: from, name: name && `${name}-from`, onChange: ubah("from") }}
        toInputProps={{ defaultValue: to, name: name && `${name}-to`, onChange: ubah("to") }}
      />
    );
  },
  { props: peta["date-range-picker"].props },
);

export {};
