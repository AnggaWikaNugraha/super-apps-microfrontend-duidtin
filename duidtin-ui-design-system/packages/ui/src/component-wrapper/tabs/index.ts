// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// <dtn-tabs> dirakit TANGAN di ./rakitan.tsx — berkas itu tidak pernah ditimpa
// codegen, karena susunan bagian compound-nya tidak bisa disimpulkan otomatis.
//
// bagian-bagiannya bertukar data lewat React Context (id, aria-*, fokus, keyboard), jadi semuanya
// dirakit di dalam SATU React root — bukan satu elemen per bagian. Daftar tab dari atribut `items`
// (JSON); isi panel yang sedang aktif datang dari anak light DOM.

import "./rakitan";

export const NAMA_ELEMEN = "dtn-tabs";

export default NAMA_ELEMEN;
