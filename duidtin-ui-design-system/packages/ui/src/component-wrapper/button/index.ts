// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-button> menjalankan komponen React Button yang sama, dengan kelas CSS
// yang sama. Yang berbeda hanya antarmukanya: atribut HTML + CustomEvent, supaya
// bisa dipakai dari Vue/Svelte/Angular tanpa tahu-menahu soal React.

import { Button } from "../../components/button";
import { buatElemen } from "../utils/inti";

export const NAMA_ELEMEN = "dtn-button";

buatElemen(NAMA_ELEMEN, Button as never, { props: { color: "string", isDisabled: "boolean", size: "string", type: "string", variant: "string" }, events: { onPress: "press" } });

export default NAMA_ELEMEN;
