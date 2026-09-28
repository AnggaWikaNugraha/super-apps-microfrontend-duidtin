// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-empty-state> menjalankan komponen React EmptyState yang sama, dengan kelas CSS
// yang sama. Yang berbeda hanya antarmukanya: atribut HTML + CustomEvent, supaya
// bisa dipakai dari Vue/Svelte/Angular tanpa tahu-menahu soal React.

import { EmptyState } from "../../components/empty-state";
import { buatElemen } from "../utils/inti";

export const NAMA_ELEMEN = "dtn-empty-state";

buatElemen(NAMA_ELEMEN, EmptyState as never, { props: { size: "string", variant: "string" } });
buatElemen("dtn-empty-state-icon", EmptyState.Icon as never);
buatElemen("dtn-empty-state-title", EmptyState.Title as never);
buatElemen("dtn-empty-state-description", EmptyState.Description as never);
buatElemen("dtn-empty-state-action", EmptyState.Action as never);

export default NAMA_ELEMEN;
