// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-skeleton> menjalankan komponen React Skeleton yang sama, dengan kelas CSS
// yang sama. Yang berbeda hanya antarmukanya: atribut HTML + CustomEvent, supaya
// bisa dipakai dari Vue/Svelte/Angular tanpa tahu-menahu soal React.

import { Skeleton } from "../../components/skeleton";
import { buatElemen } from "../utils/inti";

export const NAMA_ELEMEN = "dtn-skeleton";

buatElemen(NAMA_ELEMEN, Skeleton as never, { props: { lines: "number", variant: "string" } });
buatElemen("dtn-skeleton-lines", Skeleton.Lines as never);

export default NAMA_ELEMEN;
