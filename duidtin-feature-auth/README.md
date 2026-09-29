# duidtin-feature-auth

**English** · [Bahasa Indonesia](README.id.md)

The login page **and the "session expired" modal**, exposed as Module Federation remotes. The `duidtin-ui` host registers them: `./login` renders at route `/login`, `./sesi-berakhir` is layered over whatever page is open when the session dies.

Its stack matches `duidtin-feature-beranda` — Next 16 + Rspack + MF 2.x — rather than the Next 14 + webpack used by the host, layout and design system. Beranda already proved that combination works, so this repo simply follows it.

## Getting started

```
../duidtin-ui-design-system/  bun run dev:producer   :3001   ← required, provides TextField & Button
this folder                   bun install && bun run dev :3004   ← open http://localhost:3004/auth
```

Unlike beranda, **this repo can be used on its own.** The form really works at `:3004` because `@duidtin/auth` creates a fallback store when `window.__DUIDTIN_AUTH__` is missing. For a real login, `duidtin-api` must also run on `:4000` (`CORS_ORIGINS` already includes `http://localhost:3004`).

For the full production-like chain, add `../duidtin-ui-layout` (`:3002`) and `../duidtin-ui` (`:3000`), then open `http://localhost:3000/login`.

| Command | What it does |
|---|---|
| `bun run dev` | dev server `:3004` |
| `bun run build` | production build (`prebuild` runs `paket` + `style` + `tipe` first) |
| `bun run style` | compiles Tailwind → `styles/global.exposes.ts` |
| `bun run tipe` | downloads the design system's types → `@mf-types/` |
| `bun run paket` | builds `@duidtin/auth` then re-runs `bun install` here |
| `bun run check-types` | `tsc --noEmit` |

## Env

| Env | Meaning | When |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | base URL of `duidtin-api`. Empty → `http://localhost:4000` | set it explicitly in the Vercel project; once the API is public, change the value and **redeploy** |
| `MF_PUBLIC_PATH` | absolute asset URL, **dev only** (`bun run dev` sets it itself) | never set it on Vercel — the chunk URLs would be baked to localhost |

`NEXT_PUBLIC_*` is inlined at build time, so changing it in the dashboard does nothing until a redeploy. And it must be set **per project**: the host has its own copy of `baseUrl`, this remote has its own, and beranda will too.

## Session-expired modal

An expired session (1 day after login) does not throw the user back to `/login`. The auth
package marks the status `kedaluwarsa` while remembering the name and email, the host layers
this modal on top, and requests held inside the package resume as soon as the password is
correct — the page behind loses nothing.

```
status "kedaluwarsa"
  └─ host: GuardSesi → loadRemote("duidtin_feature_auth/sesi-berakhir")
       ├─ name + email PREFILLED from penggunaTerakhir (only the password is empty)
       ├─ [Masuk]  → login(email, password) → status "authenticated"
       │              └─ the modal disappears on its own; held requests resume with the new token
       └─ [Keluar] → logout() → status "unauthenticated" → the host goes to /login
```

| File | What it holds |
|---|---|
| [`containers/sesi-berakhir/index.tsx`](containers/sesi-berakhir/index.tsx) | the design-system `Modal`, `isDismissable={false}` — no Esc, no click-outside |
| [`hooks/use-login-ulang.ts`](hooks/use-login-ulang.ts) | email from the store, `login()`, `keluar()`, error mapping |
| [`stores/login-ulang.ts`](stores/login-ulang.ts) | password + error message + submitting flag (separate from the login form) |

## Flow

```
RENDER
  host /login ──loadRemote("duidtin_feature_auth/login")──▶ containers/login
    └─ components/remote/design-system.tsx
         ├─ ensureDesignSystemRegistered()   register the design system in THIS repo's MF runtime
         └─ loadRemote("…/components/text-field" | "…/button" | "…/alert")

SUBMIT
  useLogin.kirim()
    └─ login(email, password)          ← @duidtin/auth
         ├─ POST /auth/login
         ├─ success → setSession() into the HOST's store (window.__DUIDTIN_AUTH__) → localStorage
         │            └─ onSuccess?.()  ← the host does the redirect
         └─ failure → AuthError → pesanGalat → <Alert variant="danger">
```

## Types from the design system (`@mf-types`)

Remote component props are **not re-declared** here. They come from the design system's type archive:

```
design-system build → @mf-types.zip  (contains node_modules/@duidtin/ui)
        │
bun run tipe   (scripts/ambil-tipe-design-system.ts)   ← runs automatically via predev & prebuild
  └─ download + unpack into @mf-types/duidtin_ui_design_system/
        │
import type { Button } from "@mf-types/duidtin_ui_design_system/components/button";
export type ButtonProps = ComponentProps<typeof Button>;
```

| Item | Detail |
|---|---|
| Archive source | `MF_TYPES_URL`, defaults to the design system's production domain |
| Download failure | **a warning, not an error** — the build continues with the committed copy |
| `@mf-types/` | **committed** (like qcash), so builds do not depend on the network |
| devDependencies `react-aria-components` + `tailwind-variants` | types only, never bundled — without them the props loosen back to `any` |
| Versions of those two | must track the design system's; drift makes the types disagree |

Why bother: hand-written interfaces drift silently. New variants never arrive, removed variants stay "allowed", and callback signatures can be wrong without anyone noticing.

## Contract with the host

| Item | Value |
|---|---|
| Container name | `duidtin_feature_auth` |
| Exposes | `./login`, `./sesi-berakhir`, `./globals` (CSS) |
| `./login` props | `onSuccess?: () => void` |
| `./sesi-berakhir` props | none — everything comes from the session store |
| basePath | `/auth` — `remoteEntry.js` at `/auth/_next/static/chunks/remoteEntry.js` |
| Dev port | 3004 |

**Redirecting is not this remote's job.** The `/login` and `/` routes belong to the host; the remote only calls `onSuccess`. Same pattern as `onLogout` in `duidtin-ui-layout`.

## Folder structure

```
components/remote/design-system.tsx   bridge to the design-system components (TextField/Button/Alert/Modal)
constants/federation.ts               the design system's container name & remoteEntry path
containers/login/index.tsx            ← exposed as ./login
containers/sesi-berakhir/index.tsx    ← exposed as ./sesi-berakhir
hooks/use-login.ts                    login form logic: submit, fields, error mapping
hooks/use-login-ulang.ts              modal logic: password only, email from the last session
stores/form-login.ts                  login form state (zustand)
stores/login-ulang.ts                 re-login modal state (zustand)
services/auth.ts                      configureAuth() for this bundle
services/federation.ts                registers the design system in this repo's MF runtime
utils/index.ts                        getBaseFederationUrl() — environment detection
types/global.d.ts                     window.__DUIDTIN_REMOTE_ENTRY__ + __DUIDTIN_AUTH__
pages/_app.tsx                        deliberately empty
pages/index.tsx                       the :3004 dev page — must use dynamic(), see Config below
scripts/build-styles.ts               compiles CSS into a string → styles/global.exposes.ts (generated)
scripts/ambil-tipe-design-system.ts   downloads the design system's @mf-types.zip
styles/globals.css + login.css        Tailwind prefix `fath` + login page & modal classes
@mf-types/                            the design system's types, committed
next.config.ts                        basePath /auth, exposes, shared, react alias
```

## Module Federation config

```ts
// next.config.ts
basePath: "/auth"
assetPrefix: process.env.MF_PUBLIC_PATH          // absolute in dev, empty in production
allowedDevOrigins: ["super-apps-duidtin.vercel.app"]
name: "duidtin_feature_auth"
exposes: {
  "./login":         "./containers/login/index.tsx",
  "./sesi-berakhir": "./containers/sesi-berakhir/index.tsx",
  "./globals":       "./styles/global.exposes.ts",
}
shared: { react, react-dom → singleton + eager }
resolve.alias: { react, react-dom → this repo's node_modules }
```

| Setting | Why |
|---|---|
| `shared` written by hand | `@module-federation/enhanced` does not share React automatically the way `nextjs-mf` does in the host. Without it → `Invalid hook call` |
| `eager: true` | React must already be in the share scope when the design system asks for it **synchronously** (`loadShareSync`) |
| `resolve.alias` for react | `@duidtin/auth` is installed from a local path and carries its own `zustand`; without the alias, `zustand/esm/react.mjs` fails to resolve (`resolving fallback for shared module react`) |
| absolute `assetPrefix` in dev | without it a host on `:3000` asks itself for this remote's chunks and 404s. **Never set `MF_PUBLIC_PATH` on Vercel** — it would be baked in |
| `allowedDevOrigins` | Next 16 answers 403 for cross-site script requests unless the Referer hostname is listed. This is what makes `?remote-lokal=duidtin_feature_auth@3004` work from the production host |
| `pages/index.tsx` uses `dynamic()` | a Next page is a synchronous module; without an async boundary the design-system components call `loadShareSync("react")` before the share scope is filled, and fail. It never happens under the host, which loads `./login` asynchronously |
| `@duidtin/auth` is **not** shared | its session store is already a singleton through `window.__DUIDTIN_AUTH__`, so each remote may carry its own copy of the package code |
