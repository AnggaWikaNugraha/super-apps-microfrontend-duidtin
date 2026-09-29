# duidtin-ui-layout

**English** · [Bahasa Indonesia](README.id.md)

The shared layout (sidebar + header + footer), exposed as a Module Federation remote and wrapped around every page's content by the host (`duidtin-ui`). Unlike `duidtin-ui-design-system` (pure components, no routing), this repo needs to bridge into application context (auth and so on) — which is why it is built on Next.js rather than Rslib.

## Getting started

This repo is a consumer of `duidtin-ui-design-system`, so both dev servers have to be running:

1. In `../duidtin-ui-design-system/`: `bun install`, then `bun run dev:producer` — the design-system remote goes live at `http://localhost:3001/design-system/static/remoteEntry.js`.
2. In this folder: `bun install`, then `bun run dev` — Next.js at `http://localhost:3002/layout`.
3. `bun run build` — produces `remoteEntry.js` in `.next/static/chunks/`.
4. `bun run check-types` — `tsc --noEmit`.
5. `bun run tipe` — refreshes the design system's types in `@mf-types/`. It runs automatically through `predev` and `prebuild`, so you rarely call it by hand.

Opening `http://localhost:3002/layout` only shows a guard page (see the "pages/index.tsx" section below), not a layout preview.

## Stack

- **Next.js 14.2.35** — Pages Router, Webpack (not Turbopack, which is a precondition for this MF plugin to work at all).
- **`@module-federation/nextjs-mf` 8.8.54** — this version is **pinned deliberately**: it brings `@module-federation/enhanced` **0.24.1**, exactly the version `duidtin-ui-design-system` uses. Newer releases (8.8.56+) have moved to MF `2.x`, a different version line from the design system.
- **`@module-federation/runtime` 0.24.1** — used directly in `pages/_app.tsx` (`init`) and `components/remote/design-system.tsx` (`loadRemote`), matched to the version above.
- **`webpack` 5.105.0 + `NEXT_PRIVATE_LOCAL_WEBPACK=true`** — `nextjs-mf` refuses to run against the webpack bundled into Next, so webpack is installed as its own dependency and that flag must come with it.
- **React 18.3.1** — matching `duidtin-ui-design-system`, so the shared singleton stays consistent.
- **`react-aria-components` 1.18.0 + `tailwind-variants` + `fflate`** — **devDependencies, not runtime**. The first two back the design system's component TYPES so props stay precise; `fflate` is used by the type-download script. None of them reach the bundle.
- **Tailwind CSS v4** (prefix `lyt`) — the same BEM + `@apply` pattern as the design system, just a different prefix so it can't collide with the design system's `ui:` or the host's own. **The colours themselves are not hardcoded** — they come from the design system's `var(--dtn-*)` tokens, which cascade through `:root` once its CSS loads. This file used to hardcode `blue-600` and had to be guessed into matching.

## Folder structure

```
duidtin-ui-layout/
  layouts/
    default/
      index.tsx        # the main layout: Sidebar + Header + {children} + Footer  ← the exposed one
      header.tsx
      footer.tsx
      types.ts
  components/
    remote/
      design-system.tsx  # the loadRemote bridge to duidtin_ui_design_system (Button, Badge)
  constants/
    federation.ts        # remote name + remoteEntry path + dev origin
  utils/
    index.ts             # getBaseFederationUrl() — environment detection
  styles/
    globals.css          # @import tailwindcss prefix(lyt) + per-part css imports
    default/
      layout.css
      header.css
      footer.css
  scripts/
    ambil-tipe-design-system.ts   # downloads the design system's @mf-types.zip
  @mf-types/             # the downloaded types, COMMITTED
  pages/
    _app.tsx             # init() + loadRemote globals, client-only
    index.tsx            # guard page
  module-federation.config.mjs
  next.config.mjs
  postcss.config.mjs
  vercel.json            # ignoreCommand only: skip the Vercel build when this folder is unchanged
  package.json
  tsconfig.json
```

## Module Federation config

**Two different places** both mention `remotes`, but their roles differ — don't conflate them:

### A. `module-federation.config.mjs` (the Webpack plugin, build time)

```
name: "duidtin_ui_layout"        ← underscore, not hyphen (a hyphen isn't valid in a JS
                                    variable name, and an MF container is exported via var)
filename: "static/chunks/remoteEntry.js"
exposes:
  "./default": "./layouts/default/index.tsx"
  "./globals": "./styles/globals.css"
remotes:
  duidtin_ui_design_system: <static url, hardcoding is fine for local dev>
extraOptions:
  exposePages: false
shared: {}                        ← deliberately empty, see below
```

`remotes` here is evaluated at build time and used by webpack for local/type resolution — it is **not** what decides the URL the user's browser fetches. A static, hardcoded value is fine.

`shared` is **deliberately empty**. The original plan was to declare `react`/`react-dom` as singletons here by hand, but `nextjs-mf` already shares both (plus `next/*`) automatically. Declaring them manually makes `next build` fail while prerendering `/404` & `/500` with `TypeError: Cannot read properties of null (reading 'useContext')` — two different shared lists meeting on the server side.

Only 2 exposes (`./default`, `./globals`) — this layout is nothing like the design system with its many components, so it needs no automatic exposes codegen the way `apps/producer` does.

### B. `pages/_app.tsx` (`init()` + `loadRemote()`, runtime)

```ts
init({
  name: "duidtin_ui_layout",
  remotes: [{ name: DESIGN_SYSTEM_REMOTE, entry: `${getBaseFederationUrl()}${DESIGN_SYSTEM_ENTRY_PATH}` }],
});
void loadRemote(`${DESIGN_SYSTEM_REMOTE}/globals`);
```

`getBaseFederationUrl()` ([utils/index.ts](utils/index.ts)) is an environment-detection function (reading `window.location.hostname` **at that moment**, not at build time) — it **has to be a function, not a hardcoded value**, because this is what runs in a real user's browser. Hardcoded, `duidtin-ui-layout` would always call the dev URL even when accessed from production.

> **Note:** the intent was for `init()` here to override the build-time `remotes` in A. It does **not** — for the same remote name, the build-time entry wins. The static `localhost:3001` entry in the config is left on purpose: the host registers the design system first, so production still uses the host's URL.

Locally it returns `http://localhost:3001` (the design system on a different port); anywhere else it returns the origin currently being viewed — in production every remote shares one domain, separated by their own `basePath` (`/layout` for this repo, `/design-system` for the design system).

### C. No `allowedDevOrigins` — on purpose

The production host can load the layout from a local dev server through `?remote-lokal=duidtin_ui_layout@3002` (host README, section *Dev without running every server*). For that, `next.config.mjs` **deliberately leaves** `allowedDevOrigins` unset:

- Unset, Next 14.2 stays in **warn** mode: cross-site script requests to `/_next/*` are still served, with only a warning in the terminal.
- Set, Next 14.2 switches to **block** mode, where cross-site script requests are **always** answered with a 403 — the origin list is not checked for `no-cors` requests. Unlike Next 16 in beranda, which checks the Referer.

Tested with a cross-site-flagged request against the layout dev server: 200.

### D. `assetPrefix` — absolute URLs during dev

`next.config.mjs` sets `assetPrefix: process.env.MF_PUBLIC_PATH`, and the `dev` script points it at `http://localhost:3002/layout`.

| Situation | Value | Effect |
|---|---|---|
| `bun run dev` | `http://localhost:3002/layout` | layout chunks are requested from this port, not from the host page's origin |
| `bun run build` (production) | **empty** | chunks are requested relative to the domain being browsed, then forwarded by the host's `/layout/:path*` rewrite |

Without an absolute URL in dev, a host on `:3000` would ask itself for the layout chunks and 404 — the same snag beranda hit. **Never set `MF_PUBLIC_PATH` on Vercel**: it would be baked in and production would point at localhost.

## Architecture flow

This repo plays a double role — a **remote to the host** (exposing `./default`), but also a **mini host to itself** (consuming `duidtin_ui_design_system`). So it has its own `_app.tsx` boot sequence, separate from the actual host (`duidtin-ui`).

### 1. Build time

```
module-federation.config.mjs
  └─▶ exposes: { "./default": ..., "./globals": ... }   ← what is EXPOSED outward
  └─▶ remotes: { duidtin_ui_design_system: <url> }        ← what this repo itself CONSUMES
```

### 2. Boot (`pages/_app.tsx`, before anything renders)

```
pages/_app.tsx (top level, wrapped in if (globalThis.window) — client-only, doesn't run during SSR)
  └─▶ init({ name: "duidtin_ui_layout", remotes: [{ name, entry: getBaseFederationUrl() + path }] })
        → registers the consumed remote with the MF runtime (nothing fetched yet)
  └─▶ loadRemote("duidtin_ui_design_system/globals")
        → prevents FOUC — the design system's CSS is fetched before the layout renders
```

### 3. Rendering a remote component (`components/remote/design-system.tsx`)

```
next/dynamic(() => loadRemote("duidtin_ui_design_system/components/<name>"), { ssr: false })
  └─▶ fetch the design system's remoteEntry.js (if not already), then the component's chunk
  └─▶ ssr: false is required — the component only exists in the browser runtime, it can't render on the server
```

The design system exposes each component with both a named export **and** a `default`, so the result of `loadRemote` matches what `next/dynamic` expects (`{ default }`) directly.

### 4. `pages/index.tsx` — not a preview, just a guard

This layout only truly appears when a host renders it. That page is nothing but a static "this module can't run on its own" message. The consequence: **visual verification during development goes through the host** (`duidtin-ui` on `:3000`), not through this repo. Back when there was no host, the way to do it was a temporary preview page under `pages/` rendering `<Default>` directly — that page was deleted once the host could mount this layout through the real path.

### 5. Being consumed by the host (`duidtin-ui`) — working

```
duidtin-ui (host)
  └─▶ loadRemote("duidtin_ui_layout/default")
        └─▶ fetch remoteEntry.js from duidtin-ui-layout
        └─▶ wrap each page's content: <Default>{page content}</Default>
```

Because `duidtin-ui-layout` itself consumes `duidtin_ui_design_system`, **the host must register `duidtin_ui_design_system` in its own remotes too** (not just `duidtin_ui_layout`) — so the shared `react`/`react-dom` stay a single consistent instance across the whole page rather than colliding as duplicates arriving by two different routes. This is **already done**: the host's `constants/features/registry.ts` registers both as `globalFeatures`, and the result is verified — a button loaded through the layout and one loaded directly by the host share the same React Aria ID prefix.

### The whole flow in one view

```
build         module-federation.config.mjs
                ├─▶ exposes ./default + ./globals    → this repo as a REMOTE for the host
                └─▶ remotes duidtin_ui_design_system → this repo as a CONSUMER of the design system
                      its URL is inlined into the webpack runtime chunk and REGISTERED during
                      bootstrap, before a single line of _app.tsx has run
   │
browser boot  pages/_app.tsx (top level, wrapped in if (globalThis.window) — client-only)
   │            ├─▶ getBaseFederationUrl()  reads window.location.hostname AT THAT MOMENT
   │            ├─▶ init({ name: "duidtin_ui_layout", remotes: [...] })
   │            │     the name matches the webpack container → the SAME instance is reused
   │            │     rather than a new one created (important: one react share scope)
   │            └─▶ loadRemote(".../globals")
   │                  a real fetch: the design system's remoteEntry.js + its CSS, preventing FOUC
   │
render        layouts/default/header.tsx uses <Button>
   │            └─▶ components/remote/design-system.tsx
   │                  └─▶ dynamic(() => loadRemote(".../components/<name>"), { ssr: false })
   │                        FETCHES the component chunk → only now does it appear on screen
   │
host uses it  duidtin-ui → loadRemote("duidtin_ui_layout/default")
                └─▶ <Default>{page}</Default>
```

Three distinct moments: `exposes`/`remotes` freeze at **build**, the remote entry is registered at **boot**, and component chunks are fetched at **render**. The easy thing to mix up: `loadRemote(".../globals")` at boot has already fetched the container, so rendering only needs the component chunk — it isn't starting from scratch.

> **Note:** the build-time `remotes` and the runtime `remotes` point at a remote with the **same name**, and the build-time one wins. Left as is — see the note in section B.

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
