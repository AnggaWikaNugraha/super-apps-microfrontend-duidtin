# x-duidtin

Repo latihan microfrontend (Module Federation) — pola arsitekturnya niru `qcash-ui` + `qcash-ui-design-system`, tapi digabung jadi **satu repo tunggal** (bukan repo terpisah per bagian seperti aslinya).

Bagian yang direncanakan:

| Folder | Peran | Analog di `qcash-ui` |
|---|---|---|
| `duidtin-ui-design-system/` | Global component & style, di-expose sebagai remote Module Federation | `qcash-global-component` / `qcash-ui-design-system` |
| `duidtin-layout/` (nanti) | Header/footer, layout bersama tiap halaman | `qcash-ui-header-footer` |
| `duidtin-ui/` (nanti) | Host — shell, routing, consumer semua remote | `qcash-ui` |

Fokus dulu: **`duidtin-ui-design-system`**.

---

## `duidtin-ui-design-system`

Sama seperti `qcash-ui-design-system`, dibangun pakai **Rslib** — tapi Rslib dipakai untuk **dua tujuan berbeda** di dua folder berbeda:

```
duidtin-ui-design-system/
  packages/
    ui/                 # komponen + style, library biasa (BUKAN Module Federation)
  apps/
    producer/           # yang beneran jadi remote MF (loadRemote-able)
```

### `packages/ui` — pabrik komponen

- Build pakai Rslib format `"esm"` — output-nya paket npm biasa (`dist/` berisi ESM + `.d.ts`).
- Nggak ada satu baris pun soal Module Federation di sini. Bisa dites/dipakai standalone.
- Analog `packages/components` + `packages/styles` di `qcash-ui-design-system` (digabung jadi satu folder dulu, biar simpel — belum perlu dipecah granular untuk skala latihan).

### `apps/producer` — pengepakan jadi remote MF

- Juga build pakai Rslib, tapi dengan `lib.format: "mf"` dikombinasikan dengan plugin `@module-federation/rsbuild-plugin` (`pluginModuleFederation`).
- Kombinasi ini yang menghasilkan `remoteEntry.js` + daftar `exposes` — inilah yang nanti di-`loadRemote()` oleh `duidtin-ui` (host).
- Isinya cuma `import` dari `packages/ui`, lalu re-expose lewat config MF. Tidak menulis komponen sendiri.

### Alur singkatnya

```
packages/ui  (Rslib "esm", library biasa)
      │
      ▼  di-import sebagai dependency
apps/producer  (Rslib "mf" + pluginModuleFederation → remoteEntry.js)
      │
      ▼  loadRemote("duidtin-ui-design-system/<nama>")
duidtin-ui (host, belum dibuat)
```

Referensi lengkap pola aslinya ada di [`qcash-ui-design-system/apps/producer/rslib.config.ts`](../qcash-ui-design-system/apps/producer/rslib.config.ts) dan dokumentasi arsitektur di [`CLAUDE.md`](../CLAUDE.md).
