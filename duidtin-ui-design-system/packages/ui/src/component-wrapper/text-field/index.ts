// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-text-field> dirakit TANGAN di ./rakitan.tsx — berkas itu tidak pernah ditimpa
// codegen, karena susunan bagian compound-nya tidak bisa disimpulkan otomatis.
//
// bagian-bagiannya bertukar data lewat React Context (id, aria-*, fokus, keyboard), jadi semuanya
// dirakit di dalam SATU React root — bukan satu elemen per bagian. Susunannya label → input → deskripsi
// → pesan error.

import "./rakitan";

export const NAMA_ELEMEN = "dtn-text-field";

export default NAMA_ELEMEN;
