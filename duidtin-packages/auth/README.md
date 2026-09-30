# @duidtin/auth

**English** · [Bahasa Indonesia](README.id.md)

> **Status: core + React + Vue done, 25 tests passing. Used by `duidtin-ui` (store + guard + session-expired modal) and `duidtin-feature-auth` (login & re-login); layout is not wired yet.** The session architecture lives in [README.be.id.md](../../README.be.id.md); package distribution in the [root README](../../README.md).

Session logic for every duidtin repo. Not a Module Federation remote — an ordinary package you `import`.

## Flow

```
BOOT — the host, _app.tsx, before federationInit()
  configureAuth({ baseUrl })       ← from the app's own env
  installAuthStore()
    ├─ create the store (zustand/vanilla)
    ├─ loadFromStorage()           ← localStorage["duidtin:sesi"]
    ├─ listen for "storage"        ← another tab logs in/out
    └─ window.__DUIDTIN_AUTH__ = store

REMOTE — layout, beranda (Vue), auth
  getAuthStore()                   ← borrow the host's store, whatever the framework
    └─ no global (repo opened on its own) → installAuthStore() right here

LOGIN
  login(email, password) → POST /auth/login → setSession() → write localStorage → status "authenticated"

FETCHING DATA
  http.get("/beranda/rekening")        ← the axios instance
    ├─ request interceptor   → attach Bearer; access token has < 30s left → refreshSession() first
    ├─ 401 TOKEN_KEDALUWARSA → refreshSession() → retry ONCE
    ├─ any other failure     → thrown as AuthError (never an AxiosError)
    └─ no session at all     → rejected on the client (TOKEN_TIDAK_ADA), no wasted round trip

SESSION ENDS  (1 day after login, or refresh refused)
  sesiBerlakuSampai timer ──┐
  refresh refused ──────────┴─▶ tandaiKedaluwarsa()
        ├─ tokens dropped, `penggunaTerakhir` (name + email) IS KEPT
        ├─ status "kedaluwarsa"  → the host shows the re-login modal
        └─ in-flight AND new requests are HELD, not rejected
              ├─ correct password → status "authenticated" → every held request RESUMES
              └─ Sign out         → status "unauthenticated" → requests rejected, host goes to /login

SIGNING OUT
  logout()     → forget the session + penggunaTerakhir, then POST /auth/logout   (local state cleared even if the request fails)
  logoutAll()  → the same, then POST /auth/logout-semua
```

Four statuses, and the differences matter:

| Status | Meaning | What the host does |
|---|---|---|
| `loading` | `localStorage` hydration unfinished | hold the render, do not redirect |
| `authenticated` | the session is alive | render the page |
| `kedaluwarsa` | session dead, **the user is still remembered** | keep the page, layer the re-login modal on top |
| `unauthenticated` | nobody at all (never logged in, or logged out) | send them to `/login` |

## Files

| File | What it holds |
|---|---|
| `axios.ts` | one `http` instance plus the **request** interceptor (baseUrl, Bearer, proactive refresh, **hold while expired**) and the **response** interceptor (401 expired → retry once, **hold then retry after re-login**, every failure → `AuthError`) |
| `api.ts` | the list of `duidtin-api` endpoints: URLs + types, never touching the store |
| `service.ts` | the actions that join api + store: `login`, `logout`, `logoutAll`, `refreshProfile` |
| `store.ts` | the host's `zustand/vanilla` store, borrowed through `window.__DUIDTIN_AUTH__`; the **timer** to `sesiBerlakuSampai` and `tandaiKedaluwarsa()` |
| `storage.ts` | read/write/clear `localStorage["duidtin:sesi"]` and `localStorage["duidtin:pengguna-terakhir"]` |
| `config.ts` | `configureAuth({ baseUrl })` |
| `types.ts` | a mirror of the API contract |
| `react.ts` | `useAuth()` for React — the only file that touches React |
| `vue.ts` | `useAuth()` for Vue — the same store, handed back as refs |
| `index.ts` | the package's export surface; the `/react` and `/vue` subpaths point at the two files above |
| `tests/` | `auth.test.ts` (25 tests) + `helpers.ts` (a fake axios adapter) + `setup.ts` (the mock DOM, loaded through `bunfig.toml`) |
| `bunfig.toml` | `[test] preload` for the mock DOM, and **`[install] peer = false`** — React and Vue are optional peers; if bun installed them here, a consumer's bundler could resolve a SECOND React through this package and the page would die with `Invalid hook call` |
| `tsconfig.build.json` | used by `bun run build`; emits `dist/` with ESM + `.d.ts` |

`skipAuth: true` is used by every auth endpoint in `api.ts`: their token is passed by hand, and `/auth/refresh` must never go through the interceptor — if it did, a refused refresh would trigger another refresh.

## Exports

| Path | Function | Note |
|---|---|---|
| `@duidtin/auth` | `configureAuth({ baseUrl })` | every app must call it at boot; defaults to `http://localhost:4000` |
| | `installAuthStore()` | **the host only** |
| | `getAuthStore()` | remotes; returns the host's store |
| | `http` | the token-bearing axios instance (`.get`, `.post`, …); the only way to call the API with a session |
| | `login`, `logout`, `logoutAll`, `refreshProfile` | actions; `login` throws `AuthError` when refused |
| | `getBaseUrl()` | reads back the base URL currently in use |
| | `readSession()`, `readLastUser()`, `SESSION_KEY`, `LAST_USER_KEY` | direct storage access — used by the host and the tests to inspect state without going through the store |
| | `AuthError`, `Session`, `User`, `ErrorCode`, `AuthState`, `AuthStore`, … | types; type names are English, field names still follow `duidtin-api`'s JSON (`pengguna`, `nama`, `kode`) |
| `@duidtin/auth/react` | `useAuth()` | `{ status, user, isLoggedIn, sesiKedaluwarsa, penggunaTerakhir, login, logout, logoutAll, refreshProfile }` |
| `@duidtin/auth/vue` | `useAuth()` | the same keys, except the first five are **refs** (`status.value`); the actions are plain functions |

`penggunaTerakhir` = the last user's `{ nama, email }`, used to prefill the re-login modal. It survives an expired session and is **dropped on an explicit logout** — so an email is never left behind on a shared computer.

## How it is used

```ts
// HOST — pages/_app.tsx, top level
import { configureAuth, installAuthStore } from "@duidtin/auth";

configureAuth({ baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000" });
installAuthStore();
```
```tsx
// ANY component (React)
import { useAuth } from "@duidtin/auth/react";

const { user, isLoggedIn, logout } = useAuth();
```
```ts
// ANY component (Vue) — the SAME store React reads
import { useAuth } from "@duidtin/auth/vue";

const { user, isLoggedIn, logout } = useAuth();   // user.value, isLoggedIn.value
```
```ts
// FETCHING DATA, in any repo
import { http } from "@duidtin/auth";

const { data } = await http.get("/beranda/rekening");   // data = { status, message, data }
const rekening = data.data.rekening;
```
