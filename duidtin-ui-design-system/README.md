# duidtin-ui-design-system

Global component & style library, di-expose sebagai remote Module Federation untuk dikonsumsi host (`duidtin-ui`) dan bagian lain yang membutuhkan.

Dibangun pakai **Rslib**, dipakai untuk dua tujuan berbeda di dua folder berbeda:

```
duidtin-ui-design-system/
  packages/
    ui/                 # komponen + style, library biasa (BUKAN Module Federation)
  apps/
    producer/           # yang beneran jadi remote MF (loadRemote-able)
```

## `packages/ui` — pabrik komponen

- Build pakai Rslib format `"esm"` — output-nya paket npm biasa (`dist/` berisi ESM + `.d.ts`).
- Nggak ada satu baris pun soal Module Federation di sini. Bisa dites/dipakai standalone.

## `apps/producer` — pengepakan jadi remote MF

- Juga build pakai Rslib, tapi dengan `lib.format: "mf"` dikombinasikan dengan plugin `@module-federation/rsbuild-plugin` (`pluginModuleFederation`).
- Kombinasi ini yang menghasilkan `remoteEntry.js` + daftar `exposes` — inilah yang nanti di-`loadRemote()` oleh host.
- Isinya cuma `import` dari `packages/ui`, lalu re-expose lewat config MF. Tidak menulis komponen sendiri.

## Alur singkatnya

```
packages/ui  (Rslib "esm", library biasa)
      │
      ▼  di-import sebagai dependency
apps/producer  (Rslib "mf" + pluginModuleFederation → remoteEntry.js)
      │
      ▼  loadRemote("duidtin-ui-design-system/<nama>")
duidtin-ui (host)
```
