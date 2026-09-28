// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-badge> menjalankan komponen React Badge yang sama, dengan kelas CSS
// yang sama. Yang berbeda hanya antarmukanya: atribut HTML + CustomEvent, supaya
// bisa dipakai dari Vue/Svelte/Angular tanpa tahu-menahu soal React.

import { Badge } from "../../components/badge";
import { buatElemen } from "../utils/inti";

export const NAMA_ELEMEN = "dtn-badge";

buatElemen(NAMA_ELEMEN, Badge as never, { props: { color: "string", variant: "string" } });

export default NAMA_ELEMEN;
