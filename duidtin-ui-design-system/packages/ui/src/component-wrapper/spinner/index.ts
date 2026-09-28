// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-spinner> menjalankan komponen React Spinner yang sama, dengan kelas CSS
// yang sama. Yang berbeda hanya antarmukanya: atribut HTML + CustomEvent, supaya
// bisa dipakai dari Vue/Svelte/Angular tanpa tahu-menahu soal React.

import { Spinner } from "../../components/spinner";
import { buatElemen } from "../utils/inti";

export const NAMA_ELEMEN = "dtn-spinner";

buatElemen(NAMA_ELEMEN, Spinner as never, { props: { color: "string", size: "string" } });

export default NAMA_ELEMEN;
