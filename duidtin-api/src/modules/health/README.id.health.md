# Modul `health`

> Bagian dari [duidtin-api](../../../README.id.md). Kontrak respons dan alur umum setiap request ada di README utama.

Memeriksa app hidup dan database terhubung.

| Berkas | Isi |
|---|---|
| [`health.routes.ts`](health.routes.ts) | route dan tipe `HealthData` |

Tes: [`tests/app.test.ts`](../../../tests/app.test.ts).

## `GET /health`

Memeriksa app hidup dan database terhubung. Dipakai untuk cek setelah deploy.

**Params**

Tanpa header khusus, tanpa body.

**Respons sukses — `200`**

```ts
interface HealthData {
  app: "ok";
  db: "terhubung" | "terputus";
}
```

```json
{
  "status": 200,
  "message": "Layanan berjalan normal.",
  "data": { "app": "ok", "db": "terhubung" }
}
```

**Respons gagal — `503`**

Database tidak bisa dihubungi. `data` tetap `HealthData` (bukan `DataGagal`), supaya alat pemantau cukup membaca satu bentuk:

```json
{
  "status": 503,
  "message": "Database tidak terhubung.",
  "data": { "app": "ok", "db": "terputus" }
}
```


**Alur**

Dipanggil saat: memeriksa layanan setelah deploy atau oleh alat pemantau. FE tidak memanggil endpoint ini.

```
GET /health
  └─▶ healthRouter                                   src/modules/health/health.routes.ts
        ├─▶ hubungkanDatabase()                      kalau gagal, error ditelan — justru itu yang dilaporkan
        └─▶ databaseTerhubung() ?
              ├─ ya    ─────────────────────────────▶ 200 "Layanan berjalan normal."   { app: "ok", db: "terhubung" }
              └─ tidak ─────────────────────────────▶ 503 "Database tidak terhubung."  { app: "ok", db: "terputus" }
```
