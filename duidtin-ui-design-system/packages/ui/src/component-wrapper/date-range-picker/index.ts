// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// DateRangePicker SENGAJA belum dibungkus jadi Web Component.
//
// bagian-bagiannya bertukar data lewat React Context (id, aria-*, fokus, keyboard). Tiap custom
// element punya React root sendiri dan Context tidak menyeberang antar-root, jadi memecahnya jadi
// elemen terpisah akan memutus aksesibilitasnya. Butuh elemen khusus yang merakit bagian-bagiannya
// di dalam SATU root. Ditambah popover kalender yang memakai portal.

export const BELUM_DIBUNGKUS = "bagian-bagiannya bertukar data lewat React Context (id, aria-*, fokus, keyboard). Tiap custom element punya React root sendiri dan Context tidak menyeberang antar-root, jadi memecahnya jadi elemen terpisah akan memutus aksesibilitasnya. Butuh elemen khusus yang merakit bagian-bagiannya di dalam SATU root. Ditambah popover kalender yang memakai portal.";
