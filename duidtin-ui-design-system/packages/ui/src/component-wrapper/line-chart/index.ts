// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-line-chart> menjalankan komponen React LineChart yang sama, dengan kelas CSS
// yang sama. Yang berbeda hanya antarmukanya: atribut HTML + CustomEvent, supaya
// bisa dipakai dari Vue/Svelte/Angular tanpa tahu-menahu soal React.

import { LineChart } from "../../components/line-chart";
import { buatElemen } from "../utils/inti";

export const NAMA_ELEMEN = "dtn-line-chart";

buatElemen(NAMA_ELEMEN, LineChart as never, { props: { categoryKey: "string", data: "json", height: "number", series: "json", showLegend: "boolean" } });

export default NAMA_ELEMEN;
