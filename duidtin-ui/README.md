# duidtin-ui

**English** · [Bahasa Indonesia](README.id.md)

The super-app host (shell). It owns routing, registers every remote with the Module Federation runtime, and composes pieces from other repos into a single page. On its own it **sells nothing** — everything you see on screen comes from a remote.

## Getting started

The host needs both remotes running first. Three terminals:

1. `../duidtin-ui-design-system/` → `bun install` then `bun run dev:producer` — remote at `http://localhost:3001/design-system/static/remoteEntry.js`.
2. `../duidtin-ui-layout/` → `bun install` then `bun run dev` — remote at `http://localhost:3002/layout/_next/static/chunks/remoteEntry.js`.
3. This folder → `bun install` then `bun run dev` — open `http://localhost:3000`.

`bun run build` for a production build, `bun run check-types` for `tsc --noEmit`.

If a remote isn't running the page **still renders** — the failed part is replaced by a red box from `fallbackPlugin` (see PHASE 4). That is the intended behaviour, not a bug.

## Current status

Verified working in a real browser (not just a successful build):

- Boot registers both remotes; their CSS is fetched before the first render.
- `loadRemote("duidtin_ui_layout/default")` wraps the page — header and footer render with their styles intact.
- The host consumes `duidtin_ui_design_system` **directly** (Card, Button), not only through the layout.
- **React stays a single instance** across all 3 repos. Concrete evidence: the button loaded through the layout and the button loaded directly by the host share the same React Aria ID prefix (`react-aria9439377283-:r2:` vs `:r6:`) — had React been duplicated, the two prefixes would differ.
- `fallbackPlugin` is proven to fire: while the layout was still failing to load, the page did not go blank; only that part was swapped for an error box.

Not there yet:

- **Feature remotes** — `featureRegistry` is still empty, so PHASE 2's scaffolding is complete but nothing exercises it. See "Next steps".
- i18n (no equivalent of `qcash-ui`'s `loadLocalesForModule` yet).
- Auth/context provider — `userName` and `onLogout` are still hardcoded in `pages/index.tsx`.
- Per-module local port overrides (`getModuleEntry` layer B in `qcash-ui`) — not worth it while there are only two remotes.

## Stack

Versions are **pinned and must match** `duidtin-ui-layout`. This is not a preference: a different version line breaks the shared scope.

- **Next.js 14.2.35** — Pages Router, Webpack (not Turbopack; a requirement of the MF plugin).
- **`@module-federation/nextjs-mf` 8.8.54** — the version that brings `@module-federation/enhanced` 0.24.1, matching the design system.
- **`@module-federation/runtime` 0.24.1** — used directly in `init.ts` (`init`) and `components/remote/` (`loadRemote`).
- **`@module-federation/retry-plugin` 0.24.1** — PHASE 4, layer 1.
- **`webpack` 5.105.0 + `NEXT_PRIVATE_LOCAL_WEBPACK=true`** — `nextjs-mf` refuses Next's bundled webpack.
- **React 18.3.1**, **Tailwind CSS v4** (prefix `app`, kept distinct from the design system's `ui` and the layout's `lyt`).

## Folder structure

```
duidtin-ui/
  constants/features/
    registry.ts          # DATA: globalFeatures + featureRegistry
    types.ts             # FeatureMetadata
  services/federation/
    init.ts              # federationInit() — the PHASE 1 orchestrator
    fallbackPlugin.tsx   # PHASE 4, layer 2
    utils/
      registry.ts        # getAllFeatures / getGlobalFeatures / getModulesForRoute
      module-entry.ts    # getModuleEntry(name) → URL
      loader.ts          # dynamicLoadStyles(name)
  components/
    federation/
      provider.tsx       # PHASE 2: waitForFederation + per-route warm-up
      hooks/useModuleLoading.ts
    remote/index.tsx     # loadRemote → next/dynamic bridge
    ui/RemoteErrorBoundary.tsx   # PHASE 4, layer 3
  utils/index.ts         # getBaseFederationUrl() — environment detection
  pages/
    _app.tsx             # PHASE 1 is kicked off here + provider + getLayout
    index.tsx            # PHASE 3 — the first page that actually renders remotes
  styles/globals.css     # tailwind prefix(app)
  types/global.d.ts      # window.__FEDERATION_LOADED
  module-federation.config.mjs
  next.config.mjs
```

## Why `remotes` and `exposes` are empty

```js
// module-federation.config.mjs
name: "duidtin_ui",
filename: "static/chunks/remoteEntry.js",
remotes: {},   // ← resolved at RUNTIME, not build time
exposes: {},   // ← permanently empty
```

**`remotes: {}`** — this is the deepest difference from `duidtin-ui-layout`, where hardcoding `remotes` is fine. If the host's remote list were static here, adding a single new remote would force a host rebuild and redeploy. Leaving it empty means the list is resolved later by ordinary JS (`federationInit()`), so adding a feature is just one more entry in `constants/features/registry.ts`.

**`exposes: {}`** — permanently. The host is only ever a consumer, never a remote for another repo. `filename` is still required because the plugin needs a name for its own container to manage the shared scope, even though nobody consumes it.

## Architecture flow

Four phases that run at **different times**. The easiest confusion: PHASE 2 and PHASE 3 both run on every navigation, but only PHASE 3 puts anything on screen.

```
PHASE 0  Build time         → once, during `next build`
PHASE 1  Boot                → once, when the browser first loads the host bundle
PHASE 2  Per-route preload   → on every navigation (warm-up, NOT render)
PHASE 3  The actual render   → on every navigation (THIS is what appears on screen)
PHASE 4  Error handling      → any time something fails, in any phase
```

### PHASE 1 — Boot (`pages/_app.tsx` → `services/federation/init.ts`)

```
pages/_app.tsx (top level, client only, before React renders anything)
  └─▶ federationInit()
        ├─▶ getAllFeatures()        → ALL remotes: global + featureRegistry
        ├─▶ getModuleEntry(name)     → each remote → its real URL
        │     └─▶ getBaseFederationUrl(devOrigin)  [reads the browser hostname NOW]
        ├─▶ init({ name, remotes, plugins })
        │     → registers every remote with the MF runtime. NOTHING is fetched yet.
        ├─▶ window.__FEDERATION_LOADED = true      → the green light for PHASE 2
        └─▶ dynamicLoadStyles(globalFeatures)      → the first REAL fetch, prevents FOUC
```

**Why there is no top-level `await`.** The `qcash-ui` host uses a top-level `await` in `_app.tsx`. It isn't needed here: `init()` is called **before the first `await`** inside `federationInit()`, so every remote is registered the moment `void federationInit()` returns — synchronously. The only thing awaited inside is the CSS warm-up, and that must not delay module evaluation. The consequence is that the CSS request leaves earlier (at boot) than any remote component chunk (only on mount), so in practice the CSS always lands first.

### PHASE 2 — Per-route preload (`components/federation/provider.tsx`)

```
provider.tsx useEffect (whenever router.pathname changes)
  ├─▶ waitForFederation()            [polls __FEDERATION_LOADED, gives up after 5s]
  └─▶ loadModulesByRoute(pathname)   [hooks/useModuleLoading.ts]
        ├─▶ getModulesForRoute(route)  → filters featureRegistry, WITHOUT globalFeatures
        └─▶ loadModule(name) → dynamicLoadStyles(name) → loadRemote(name + "/globals")
```

`getModulesForRoute()` deliberately excludes `globalFeatures` — those were loaded unconditionally in PHASE 1 and don't need route matching.

Polling is required instead of a plain `await` because `federationInit()` is called at the top level of the `_app.tsx` module — outside React — so components have no handle on its promise.

> While `featureRegistry` is empty this phase is **always a no-op**. The scaffolding is in place on purpose, so that adding the first feature remote is one registry entry rather than rebuilding the loading path.

### PHASE 3 — The actual render (`pages/index.tsx`)

This is what genuinely puts components on screen, and it is **entirely independent of `registry.ts`** — written by hand, one file per page.

```tsx
const DefaultLayout = dynamic(() => loadRemote("duidtin_ui_layout/default"), { ssr: false });

HomePage.getLayout = (page) => <DefaultLayout>{page}</DefaultLayout>;
```

The rules:

- **`ssr: false` is mandatory** — the module is fetched at runtime from another origin, so it does not exist while Next prerenders on the server.
- **The layout is a remote too**, loaded separately on each page via the `getLayout` pattern.
- **Nothing is generated** from the registry. Adding a sub-page means touching 2 repos: a new `exposes` entry in the remote, and a new page file here.

### PHASE 4 — Error handling: 3 layers for 3 kinds of failure

| Layer | File | Handles |
|---|---|---|
| 1. `RetryPlugin` | `init.ts` | Script fetch failed (flaky network) → retry 3×, 1s apart |
| 2. `fallbackPlugin` | `fallbackPlugin.tsx` | Called **after** retries are exhausted → swap the module for an error box instead of going blank |
| 3. `RemoteErrorBoundary` | `components/ui/` | Module loaded **successfully** but **crashed while rendering** — a case that never reaches the `errorLoadRemote` hook |

The order: try again → if it still fails, replace the UI → if loading actually succeeded and the component itself is buggy, the boundary catches it.

> Note: `nextjs-mf` quietly injects its own internal plugin which also hooks `errorLoadRemote`, and it logs `"<id> offline"` **without** the error object. If you see that in the console, the real error is in the `[MFE]` log from `fallbackPlugin` — which is precisely why the plugin in this repo deliberately logs `error` as well.

## Two naming layers that are easy to mix up

| | Written as | Example |
|---|---|---|
| Repo / folder name | hyphens | `duidtin-ui-layout` |
| MF container name | **underscores** | `duidtin_ui_layout` |

An MF container is exported through a `var` declaration, and hyphens aren't valid in a JS identifier. `registry.ts` **always** holds the underscore form.

## Why `entryPath` is stored per feature

```ts
{ name: "duidtin_ui_design_system", entryPath: "/design-system/static/remoteEntry.js",       devOrigin: ":3001" }
{ name: "duidtin_ui_layout",        entryPath: "/layout/_next/static/chunks/remoteEntry.js", devOrigin: ":3002" }
```

The shapes differ because the build tools differ: the design system uses **Rslib** (`/static/`), the layout uses **Next** (`/_next/static/chunks/`). So a single `buildStandardEntryUrl()` formula like `qcash-ui`'s cannot work — the path genuinely has to be data, not something derived from the name.

`devOrigin` only matters during local dev (each remote on its own port). Off localhost it is ignored: every remote shares one domain and is told apart by the prefix in `entryPath`.

## Next steps

1. **The first feature remote** (`duidtin-ui-<feature>`, port 3003) — this is what will activate the currently idle PHASE 2 and prove route matching works. Two things its config must get right from day one, both lessons from the layout (see its README):
   - an absolute `assetPrefix` in dev, otherwise its chunks are requested from the host's origin and 404;
   - `shared: {}`, letting `nextjs-mf` handle react.
2. An auth/context provider, so `userName` and `onLogout` stop being hardcoded.
3. Per-module i18n.
