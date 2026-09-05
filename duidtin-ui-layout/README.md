# duidtin-ui-layout

**English** · [Bahasa Indonesia](README.id.md)

The shared layout (header + footer), exposed as a Module Federation remote and wrapped around every page's content by the host (`duidtin-ui`). Unlike `duidtin-ui-design-system` (pure components, no routing), this repo needs to bridge into application context (auth and so on) — which is why it is built on Next.js rather than Rslib.

## Getting started

This repo is a consumer of `duidtin-ui-design-system`, so both dev servers have to be running:

1. In `../duidtin-ui-design-system/`: `bun install`, then `bun run dev:producer` — the design-system remote goes live at `http://localhost:3001/design-system/static/remoteEntry.js`.
2. In this folder: `bun install`, then `bun run dev` — Next.js at `http://localhost:3002/layout`.
3. `bun run build` — produces `remoteEntry.js` in `.next/static/chunks/`.
4. `bun run check-types` — `tsc --noEmit`.

Opening `http://localhost:3002/layout` only shows a guard page (see the "pages/index.tsx" section below), not a layout preview.

## Current status

Done and verified working:
- `layouts/default/` — Header + `{children}` + Footer, exposed as `./default`.
- The header consumes `Button` & `Badge` from `duidtin_ui_design_system` through `loadRemote()` — the "a remote calling another remote" pattern is proven to actually render in a browser (not merely to build), styles included.
- `styles/globals.css` exposed as `./globals`.
- `pages/index.tsx` is a guard page, and `exposePages: false` keeps it from being exposed.
- **Mounted by the real host.** `duidtin-ui` renders this layout through `loadRemote("duidtin_ui_layout/default")`, verified in a browser. That first mount is what uncovered item 8 under "Snags".

Not done:
- Real auth/context bridging — `onLogout` & `userName` are still plain props, not wired to any provider.
- i18n, deploy/container config.

## Stack

- **Next.js 14.2.35** — Pages Router, Webpack (not Turbopack, which is a precondition for this MF plugin to work at all).
- **`@module-federation/nextjs-mf` 8.8.54** — this version is **pinned deliberately**: it brings `@module-federation/enhanced` **0.24.1**, exactly the version `duidtin-ui-design-system` uses. Newer releases (8.8.56+) have moved to MF `2.x`, a different version line from the design system.
- **`@module-federation/runtime` 0.24.1** — used directly in `pages/_app.tsx` (`init`) and `components/remote/design-system.tsx` (`loadRemote`), matched to the version above.
- **`webpack` 5.105.0 + `NEXT_PRIVATE_LOCAL_WEBPACK=true`** — `nextjs-mf` refuses to run against the webpack bundled into Next; both of these are required, not either/or (see "Snags we hit").
- **React 18.3.1** — matching `duidtin-ui-design-system`, so the shared singleton stays consistent.
- **Tailwind CSS v4** (prefix `lyt`) — the same BEM + `@apply` pattern as the design system, just a different prefix so it can't collide with the design system's `ui:` or the host's own.

## Folder structure

```
duidtin-ui-layout/
  layouts/
    default/
      index.tsx        # the main layout: Header + {children} + Footer  ← the exposed one
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
  pages/
    _app.tsx             # init() + loadRemote globals, client-only
    index.tsx            # guard page
  module-federation.config.mjs
  next.config.mjs
  postcss.config.mjs
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

> **Note:** the intent was for `init()` here to override the build-time `remotes` in A. In reality it does not yet — see [Snags](#snags-we-hit-and-why-the-fixes-look-like-that), item 7.

Locally it returns `http://localhost:3001` (the design system on a different port); anywhere else it returns the origin currently being viewed — in production every remote shares one domain, separated by their own `basePath` (`/layout` for this repo, `/design-system` for the design system).

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
render        layouts/default/header.tsx uses <Button> / <Badge>
   │            └─▶ components/remote/design-system.tsx
   │                  └─▶ dynamic(() => loadRemote(".../components/<name>"), { ssr: false })
   │                        FETCHES the component chunk → only now does it appear on screen
   │
host uses it  duidtin-ui → loadRemote("duidtin_ui_layout/default")
                └─▶ <Default>{page}</Default>
```

Three distinct moments: `exposes`/`remotes` freeze at **build**, the remote entry is registered at **boot**, and component chunks are fetched at **render**. The easy thing to mix up: `loadRemote(".../globals")` at boot has already fetched the container, so rendering only needs the component chunk — it isn't starting from scratch.

> **Not resolved yet:** the build-time `remotes` and the runtime `remotes` point at a remote with the **same name**, and the build-time one turns out to win — see [Snags](#snags-we-hit-and-why-the-fixes-look-like-that), last item.

## Snags we hit (and why the fixes look like that)

None of the eight below were in the original plan. Items 1-7 surfaced once this repo became the design system's first real consumer; item 8 only surfaced once the `duidtin-ui` host made this repo a *consumed* remote for the first time. Items 3-6 are fixed in the `duidtin-ui-design-system` repo, not here; item 7 is still open.

1. **`nextjs-mf` needs a local webpack.** The build died immediately: `process.env.NEXT_PRIVATE_LOCAL_WEBPACK is not set to true`. Fix: `npm install webpack` plus the env var prefixed onto the `dev`/`build` scripts — both, not either.

2. **A too-new `enhanced-resolve` crashes the Next 14 build.** Once local webpack was installed, up came `TypeError: _resolveContext_stack.delete is not a function`. The cause: `enhanced-resolve` ≥5.19 changed `resolveContext.stack` from a real `Set` to a linked list that merely resembles one (no `.delete`), while Next's internal plugins still call `.delete`. Fix: an `overrides` entry in `package.json` pinning `5.18.3`.

3. **The remote was never being served.** `apps/producer` in the design system used to have `rslib build --watch` as its `dev` script — that only writes to `dist/`, it starts no HTTP server, so `http://localhost:3001` had nothing on it. Fix (in the design system): switch to `rslib mf-dev`.

4. **Remote chunks fetched from the wrong origin.** The design system's `assetPrefix` was a relative path (`/design-system/static/`), so when consumed from `localhost:3002` the chunks were looked for at `localhost:3002/design-system/static/...` → `ChunkLoadError`. Fix (in the design system): during dev, set `MF_PUBLIC_PATH` to an absolute URL (`http://localhost:3001/design-system/static/`). Production is unaffected because every remote shares one domain there.

5. **The host page reloaded endlessly.** The rsbuild dev client was bundled into `remoteEntry.js`, and once loaded it called `location.reload()` on the **consumer's** page — this page reloaded over and over and the remote components never got a chance to render. Fix (in the design system): `dev: { hmr: false, liveReload: false }` in the producer's `rslib.config.ts`.

6. **Remote components rendered, but completely unstyled.** The design system's `dist/index.tailwind.css` turned out to still contain raw `@apply ui:...` — Tailwind was never compiled during `rslib build`, the file was merely copied through. This had been masked all along by Storybook compiling Tailwind itself through `@tailwindcss/vite`, so the components looked right in Storybook while the published CSS was broken. Fix (in the design system): add `postcss.config.mjs` to `packages/ui` and exclude `.css` files from the `bundle: false` entry.

7. **The runtime `remotes` does NOT override the build-time one — still open.** `module-federation.config.mjs` registers `duidtin_ui_design_system` at `http://localhost:3001/...` (hardcoded), and `pages/_app.tsx` registers the same name at whatever `getBaseFederationUrl()` returns. The assumption was that the runtime one wins. What actually happens is the reverse:

   - The build-time URL is inlined into the webpack runtime chunk and registered during bootstrap, **before** the `_app.tsx` module is executed.
   - `init()` in `_app.tsx` uses the same `name`, so the runtime **reuses the existing instance** (`getGlobalFederationInstance`) rather than creating a new one.
   - Merging the remotes goes through `formatAndRegisterRemote(...)`, which calls `registerRemote(remote, res, { force: false })`. If a remote name is already registered and `force` isn't set, the new entry is **discarded silently** — with no warning at all (the warning message is only emitted on the `force: true` branch).

   The effect: in production `duidtin-ui-layout` would look for the design system at `http://localhost:3001` and fail. It isn't visible today because it has only ever run in local dev — where `getBaseFederationUrl()` happens to return `http://localhost:3001` as well, identical to the build-time value, so right and wrong are indistinguishable.

   Two options for a fix (neither applied yet):
   - **Empty out `remotes` in `module-federation.config.mjs`** (to `{}`) so the runtime is the only thing registering it. This is the pattern the `qcash-ui` host uses. It is safe because this repo never statically `import()`s a remote module — everything goes through `loadRemote()`.
   - Or change `init({ remotes })` into `init({ name })` + `registerRemotes([...], { force: true })`, which overrides the old entry explicitly.

8. **This repo's own chunks were fetched from the host's origin — the mirror image of item 4.** The moment `duidtin-ui` tried `loadRemote("duidtin_ui_layout/default")`, `remoteEntry.js` loaded fine but everything inside it died with:

   ```
   ChunkLoadError: Loading chunk __federation_expose_default failed.
   (error: http://localhost:3000/layout/_next/static/chunks/__federation_expose_default.js)
                           ^^^^ the HOST's port, not this repo's
   ```

   Cause: without an `assetPrefix`, webpack's `publicPath` is `auto`, which resolves relative to **the page currently open** — and that page belongs to the host (`:3000`), not to this repo (`:3002`). This is exactly the same failure the design system already fixed in item 4; this repo had it all along, but it was invisible because until now this repo had only ever been a *consumer*, never a *consumed* remote. Nothing loads its chunks cross-origin until a host exists.

   Fix: `assetPrefix: process.env.MF_PUBLIC_PATH` in `next.config.mjs`, with `MF_PUBLIC_PATH=http://localhost:3002/layout` prefixed onto the `dev` script — the same shape as the design system's fix. Production is unaffected, since every remote shares one domain there and `basePath` is enough.

   Diagnosing it was harder than it should have been: `nextjs-mf` injects an internal plugin whose `errorLoadRemote` logs only `"duidtin_ui_layout/default offline"` and swallows the error object. The real `ChunkLoadError` only appeared after the host's own `fallbackPlugin` was changed to log `error` too.

## Next steps

The `duidtin-ui` host now exists and renders this layout for real, so the loop is closed. What remains here:

- **Item 7 above is still open** — and it now matters more than before. The host registers `duidtin_ui_design_system` in its own remotes too, so a wrong build-time URL in this repo has a second path to bite in production.
- Real auth/context bridging — `onLogout` and `userName` are still plain props, wired to nothing.
- i18n and deploy/container config.
