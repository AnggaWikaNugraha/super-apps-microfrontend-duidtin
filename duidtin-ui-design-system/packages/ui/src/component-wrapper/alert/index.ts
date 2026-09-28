// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-alert> menjalankan komponen React Alert yang sama, dengan kelas CSS
// yang sama. Yang berbeda hanya antarmukanya: atribut HTML + CustomEvent, supaya
// bisa dipakai dari Vue/Svelte/Angular tanpa tahu-menahu soal React.

import { Alert } from "../../components/alert";
import { buatElemen } from "../utils/inti";

export const NAMA_ELEMEN = "dtn-alert";

buatElemen(NAMA_ELEMEN, Alert as never, { props: { variant: "string" } });
buatElemen("dtn-alert-icon", Alert.Icon as never);
buatElemen("dtn-alert-content", Alert.Content as never);
buatElemen("dtn-alert-title", Alert.Title as never);
buatElemen("dtn-alert-description", Alert.Description as never);

export default NAMA_ELEMEN;
