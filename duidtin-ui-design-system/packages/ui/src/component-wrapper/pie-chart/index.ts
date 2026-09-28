// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-pie-chart> menjalankan komponen React PieChart yang sama, dengan kelas CSS
// yang sama. Yang berbeda hanya antarmukanya: atribut HTML + CustomEvent, supaya
// bisa dipakai dari Vue/Svelte/Angular tanpa tahu-menahu soal React.

import { PieChart } from "../../components/pie-chart";
import { buatElemen } from "../utils/inti";

export const NAMA_ELEMEN = "dtn-pie-chart";

buatElemen(NAMA_ELEMEN, PieChart as never, { props: { data: "json", height: "number", showLegend: "boolean" } });

export default NAMA_ELEMEN;
