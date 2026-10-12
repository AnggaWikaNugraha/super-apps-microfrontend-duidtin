// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-table> dirakit TANGAN di ./rakitan.tsx — berkas itu tidak pernah ditimpa
// codegen, karena susunan bagian compound-nya tidak bisa disimpulkan otomatis.
//
// bagian-bagiannya bertukar data lewat React Context (id, aria-*, fokus, keyboard), jadi semuanya
// dirakit di dalam SATU React root — bukan satu elemen per bagian. Kolom dan baris datang dari
// atribut `columns` dan `rows` (JSON) — isi sel sebatas teks.

import "./rakitan";

export const NAMA_ELEMEN = "dtn-table";

export default NAMA_ELEMEN;
