// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-card> menjalankan komponen React Card yang sama, dengan kelas CSS
// yang sama. Yang berbeda hanya antarmukanya: atribut HTML + CustomEvent, supaya
// bisa dipakai dari Vue/Svelte/Angular tanpa tahu-menahu soal React.

import { Card } from "../../components/card";
import { buatElemen } from "../utils/inti";

export const NAMA_ELEMEN = "dtn-card";

buatElemen(NAMA_ELEMEN, Card as never, { props: { size: "string", variant: "string" } });
buatElemen("dtn-card-header", Card.Header as never);
buatElemen("dtn-card-body", Card.Body as never);
buatElemen("dtn-card-footer", Card.Footer as never);

export default NAMA_ELEMEN;
