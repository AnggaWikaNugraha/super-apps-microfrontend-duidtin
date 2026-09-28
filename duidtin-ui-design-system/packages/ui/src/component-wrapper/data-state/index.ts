// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-data-state> menjalankan komponen React DataState yang sama, dengan kelas CSS
// yang sama. Yang berbeda hanya antarmukanya: atribut HTML + CustomEvent, supaya
// bisa dipakai dari Vue/Svelte/Angular tanpa tahu-menahu soal React.

import { DataState } from "../../components/data-state";
import { buatElemen } from "../utils/inti";

export const NAMA_ELEMEN = "dtn-data-state";

buatElemen(NAMA_ELEMEN, DataState as never, { props: { emptyMessage: "string", errorDescription: "string", errorTitle: "string", isEmpty: "boolean", isError: "boolean", isLoading: "boolean" }, events: { onRetry: "retry" } });

export default NAMA_ELEMEN;
