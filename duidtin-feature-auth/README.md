# duidtin-feature-auth

**English** · [Bahasa Indonesia](README.id.md)

The login page, exposed as a Module Federation remote. The `duidtin-ui` host already registers it and renders it at route `/login`.

Its stack matches `duidtin-feature-beranda` — Next 16 + Rspack + MF 2.x — rather than the Next 14 + webpack used by the host, layout and design system. Beranda already proved that combination works, so this repo simply follows it.

## Getting started

```
../duidtin-ui-design-system/  bun run dev:producer   :3001   ← required, provides TextField & Button
this folder                   bun install && bun run dev :3004   ← open http://localhost:3004/auth
```

Unlike beranda, **this repo can be used on its own.** The form really works at `:3004` because `@duidtin/auth` creates a fallback store when `window.__DUIDTIN_AUTH__` is missing. For a real login, `duidtin-api` must also run on `:4000` (`CORS_ORIGINS` already includes `http://localhost:3004`).

For the full production-like chain, add `../duidtin-ui-layout` (`:3002`) and `../duidtin-ui` (`:3000`), then open `http://localhost:3000/login`.

## Current status

Verified in a browser (`:3004`, design system from its dev server):

- The form renders fully: two `TextField`s (email + password) and a `Button`, all from the design system.
- The button stays disabled until both fields are filled, then enables.
- Submitting with the API down → a red `Alert` *"Tidak bisa menghubungi server…"*, with both fields marked invalid.

Not yet:

- A real login against `duidtin-api` (the success path) has not been tested end to end yet.
- Vercel deployment + `REMOTE_AUTH_URL` in the host.
- Forgot-password / activation pages.

## Coding rules this repo follows

| Rule | Here |
|---|---|
| Every action and piece of logic lives in a custom hook | [`hooks/use-login.ts`](hooks/use-login.ts) — submit, error mapping, the `bisaKirim` guard, **and the field wiring** |
| State goes to Zustand, not `useState` | [`stores/form-login.ts`](stores/form-login.ts) — email, password, error message, submitting flag |
| UI comes from the design system | `TextField`, `Button`, `Alert` loaded at runtime; **no local reusable components** |

## The component never wires fields

The hook hands back ready-made `TextField` props, so the component never touches
`value`/`onChange`:

```tsx
const { fieldEmail, fieldPassword, kirim, pesanGalat, sedangKirim, bisaKirim } = useLogin({ onSuccess });

<TextField {...fieldEmail}>
  <TextFieldLabel>Email</TextFieldLabel>
  <TextFieldInput placeholder="nama@perusahaan.co.id" />
</TextField>
```

`FieldTeks` carries `value`, `onChange`, `name`, `type`, `autoComplete`, `isRequired`,
`isDisabled` (while submitting) and `isInvalid` (when there is an error). The payoff:
changing a rule — say, disabling fields while the account is locked — happens in the
hook alone, with no JSX edits.

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

## Contract with the host

| Item | Value |
|---|---|
| Container name | `duidtin_feature_auth` |
| Exposes | `./login` (component), `./globals` (CSS) |
| `./login` props | `onSuccess?: () => void` |
| basePath | `/auth` — `remoteEntry.js` at `/auth/_next/static/chunks/remoteEntry.js` |
| Dev port | 3004 |

**Redirecting is not this remote's job.** The `/login` and `/` routes belong to the host; the remote only calls `onSuccess`. Same pattern as `onLogout` in `duidtin-ui-layout`.

## Session: who owns what

```
window.__DUIDTIN_AUTH__   one session store, created by the HOST   ← borrowed here
stores/form-login.ts      form state, owned by this repo only
services/auth.ts          configureAuth({ baseUrl })               ← MUST be repeated in every remote
```

`baseUrl` is module state and every remote bundles its own copy of `@duidtin/auth`, so the host's `configureAuth()` never reaches this bundle. Only the store object is genuinely shared.

`configureAuth()` is called at module scope ([`services/auth.ts`](services/auth.ts)), not in `pages/_app.tsx`: when the host loads this remote, `_app.tsx` never executes — the host only pulls the `./login` module. The same reasoning applies to the design-system registration in [`services/federation.ts`](services/federation.ts).

## Error messages

The wording comes from `duidtin-api` (`AuthError.message`) and is shown as-is — if the backend improves a sentence, the frontend follows without a deploy.

| Situation | Code | Shown |
|---|---|---|
| Wrong email/password | `KREDENSIAL_SALAH` | the server's message |
| Account locked for 15 minutes | `AKUN_TERKUNCI` | the server's message |
| Too many attempts | `TERLALU_BANYAK_PERCOBAAN` | the server's message |
| Server down / network failure | — (`status` 0) | *"Tidak bisa menghubungi server…"* (written in the frontend, because the server never answered) |

The message appears in **one place only**, the `Alert`. Both fields are merely marked red through `isInvalid`.

## Folder structure

```
components/remote/design-system.tsx   bridge to design-system components (TextField/Button/Alert)
constants/federation.ts               design-system container name & remoteEntry path
containers/login/index.tsx            ← what is exposed as ./login
hooks/use-login.ts                    all submit logic + error mapping
pages/_app.tsx                        deliberately empty
pages/index.tsx                       the :3004 dev page — uses dynamic(), see the note below
services/auth.ts                      configureAuth() for this bundle
services/federation.ts                register the design system in this repo's MF runtime
stores/form-login.ts                  form state (zustand)
styles/globals.css                    Tailwind prefix `fath` + login.css
scripts/build-styles.ts               compile CSS into a string → styles/global.exposes.ts (generated)
```

## Two traps already hit, and their fixes

| Symptom | Cause | Fix |
|---|---|---|
| `loadShareSync failed! … whether an async boundary is implemented` when opening `:3004` | a Next page is a synchronous module; design-system components ask for React from the share scope before it is populated | `pages/index.tsx` loads the container through `dynamic()` — that is the async boundary. It never happens under the host, which loads `./login` asynchronously |
| Design-system chunks requested from `:3004`, then 404 | the design system's **production** build uses a relative `assetPrefix` (`/design-system/static/`), which is only correct behind the host's rewrites | use the design system's dev server (`bun run dev:producer`), which emits absolute `http://localhost:3001/…` URLs |

## Module Federation config

```ts
name: "duidtin_feature_auth"
exposes: { "./login": "./containers/login/index.tsx", "./globals": "./styles/global.exposes.ts" }
shared: { react, react-dom → singleton, eager }
```

- `shared` **must be written by hand**: `@module-federation/enhanced` does not share React automatically the way `nextjs-mf` does in the host. Without it → `Invalid hook call`.
- `eager: true` ensures React is already in the share scope when the design system asks for it synchronously.
- `@duidtin/auth` is **not** shared: its session store is already a singleton through `window.__DUIDTIN_AUTH__`, so each remote may carry its own copy of the package code.

## Styling

Exactly like beranda: Tailwind is compiled into a **string** by `scripts/build-styles.ts`, written to `styles/global.exposes.ts` (generated, not committed), and injected as a `<style>` when `./globals` loads. Next forbids importing global CSS from anywhere but `pages/_app.tsx`, and an exposed module is clearly not that.

This repo's Tailwind prefix is `fath` (beranda `fber`, layout `lyt`, design system `ui`). The `--dtn-*` tokens come from the design system, so the colours match every other page automatically.
