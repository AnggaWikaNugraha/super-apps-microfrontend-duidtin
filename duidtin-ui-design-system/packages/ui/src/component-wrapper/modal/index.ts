// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-modal> dirakit TANGAN di ./rakitan.tsx — berkas itu tidak pernah ditimpa
// codegen, karena susunan bagian compound-nya tidak bisa disimpulkan otomatis.
//
// bagian-bagiannya bertukar data lewat React Context (id, aria-*, fokus, keyboard), jadi semuanya
// dirakit di dalam SATU React root — bukan satu elemen per bagian. Dibuka lewat atribut `is-open`,
// bukan lewat tombol pemicu di dalamnya; isinya datang dari anak light DOM.

import "./rakitan";

export const NAMA_ELEMEN = "dtn-modal";

export default NAMA_ELEMEN;
