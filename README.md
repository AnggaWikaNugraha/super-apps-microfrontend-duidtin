# x-duidtin

**English** · [Bahasa Indonesia](README.id.md)

A Module Federation-based microfrontend super-app.

## Every remote may use a different stack

Module Federation composes applications **at runtime through a contract**, not at build time. The contract is only three things: the container name, the `exposes` list, and the shared scope. As long as those line up, each repo is free to pick its own framework and bundler — there is not a single `npm install` between them.

### 1. `duidtin-ui` — the host

- **Port** — 3000
- **Framework** — Next.js 14.2.35, Pages Router
- **Bundler** — webpack 5.105.0 (`NEXT_PRIVATE_LOCAL_WEBPACK=true`)
- **MF plugin** — `@module-federation/nextjs-mf` 8.8.54
- **MF runtime** — `@module-federation/runtime` 0.24.1 + `retry-plugin` 0.24.1
- **React** — 18.3.1
- **Tailwind** — v4.1.18, prefix `app`
- **Path** — no `basePath`; the host owns the root domain
- **Role** — the shell: routing, remote registry, consumer of every remote
- **Note** — `remotes: {}` and `exposes: {}` are deliberately empty; the remote list is resolved at runtime, not build time

### 2. `duidtin-ui-design-system` — the component library

- **Port** — 3001
- **Framework** — no Next at all
- **Bundler** — Rslib 0.19.5 + Rsbuild (`@rsbuild/plugin-react` 1.4.4)
- **Structure** — Turborepo 2.9.6 monorepo, bun 1.3.8 as package manager (`apps/producer` + `packages/ui`)
- **MF plugin** — `@module-federation/rsbuild-plugin` 0.24.1
- **React** — 18.3.1
- **Tailwind** — v4.1.18, prefix `ui`
- **Path** — `/design-system/static/`
- **Role** — 13 UI components + styles, each exposed individually
- **Note** — `dev: { hmr: false, liveReload: false }` is mandatory; without it the dev client calls `location.reload()` on the **consumer's** page

### 3. `duidtin-ui-layout` — the shared layout

- **Port** — 3002
- **Framework** — Next.js 14.2.35, Pages Router
- **Bundler** — webpack 5.105.0 (`NEXT_PRIVATE_LOCAL_WEBPACK=true`)
- **MF plugin** — `@module-federation/nextjs-mf` 8.8.54
- **MF runtime** — 0.24.1
- **React** — 18.3.1
- **Tailwind** — v4.1.18, prefix `lyt`
- **Path** — `basePath: "/layout"`
- **Role** — header + footer, wrapped around every page's content
- **Note** — a dual role: a remote for the host, and a consumer of the design system. An absolute `assetPrefix` is mandatory in dev, otherwise its chunks are requested from the host's origin and 404

### 4. `duidtin-ui-beranda` — *planned, not built yet*

- **Port** — 3003
- **Framework** — Next.js 16.2.9
- **Bundler** — **Rspack** (`next-rspack` 16.2.9)
- **MF plugin** — `@module-federation/enhanced` 2.x
- **React** — 18.3.1 (must match the host)
- **Tailwind** — v4, prefix `brd`
- **Path** — `basePath: "/beranda"`
- **Role** — the corporate dashboard: balance summary, approval queue, shortcuts
- **Note** — Turbopack (Next 16's default) does not support MF, hence Rspack. `shared` must be written by hand — `enhanced` does not auto-share React the way `nextjs-mf` does

The three most striking differences above are deliberate, not accidental:

- **The design system uses no Next at all.** It is only a component library — no routing, no SSR needed. Rslib produces a leaner bundle for that job.
- **The layout uses Next** because it will eventually bridge application context (auth, role-based menus), not merely render components.
- **Beranda uses Next 16 + Rspack** because Turbopack (Next 16's default) does not support Module Federation, while `nextjs-mf` does not support Next 15+. Rspack is the middle ground.

### What MUST match

| | Why |
|---|---|
| **React version** — 18.3.1 everywhere | it is `shared` as a singleton; two React instances on one page means an immediate `Invalid hook call` |
| **Container names** — `duidtin_ui_layout`, etc. | the exact string `loadRemote()` uses on the consumer side |
| **`exposes` keys** — `./base`, `./globals` | matched by hand across repos; nothing checks them |

### What MAY differ

Framework, bundler, MF plugin, TypeScript version, Tailwind prefix, port, `basePath`, even the package manager. The CSS prefixes are deliberately distinct (`app` / `ui` / `lyt` / `brd`) because all four render into a single page — without separate prefixes their Tailwind utility classes would collide.

> **Not yet proven:** `duidtin-ui-beranda` will run MF runtime **2.x** while the other three sit on **0.24.1**. Whether those two version lines can talk to each other is untested — it is the first thing to check once the repo exists, with the simplest possible expose, so that a failure costs only the scaffold.

### Running it

Three terminals, remotes before the host:

```bash
cd duidtin-ui-design-system && bun install && bun run dev:producer   # :3001
cd duidtin-ui-layout        && bun install && bun run dev            # :3002
cd duidtin-ui               && bun install && bun run dev            # :3000 ← open this
```

If a remote isn't running the page still renders — the failed part is swapped for an error box by `fallbackPlugin` (section 5 below). That is the intended behaviour.

---

## Architecture flow

Diagrams of the five phases. The explanation of each function — parameters, return values, and example data — lives in the [`duidtin-ui` README](duidtin-ui/README.md#architecture-flow).

### 1. Build time

```
next.config.mjs (duidtin-ui)
  └─▶ NextFederationPlugin({ ...federationConfig })
        name     : "duidtin_ui"
        filename : "static/chunks/remoteEntry.js"
        remotes  : {}    ← deliberately empty, resolved at runtime not build time
        exposes  : {}    ← the host is only a consumer, never a remote
        shared   : {}    ← nextjs-mf auto-shares react/react-dom/next
```

### 2. Boot

```
pages/_app.tsx  (top level, client only, before React renders anything)
  └─▶ federationInit()                                   → Promise<void>
        │
        ├─  guard  window.__FEDERATION_LOADED            → return if already true
        │
        ├─▶ getAllFeatures()                             → FeatureMetadata[]
        │     [...globalFeatures, ...Object.values(featureRegistry)]
        │     → [{ name, entryPath, devOrigin, routes }, …]
        │
        ├─▶ getModuleEntry(name)                         → string
        │     ├─▶ getFeatureByName(name)                 → FeatureMetadata | undefined
        │     └─▶ getFeatureEntryUrl(feature)            → string
        │           └─▶ getBaseFederationUrl(devOrigin)  → string
        │                 !window       → devOrigin
        │                 localhost     → devOrigin
        │                 anything else → window.location.origin
        │     → "http://localhost:3002/layout/_next/static/chunks/remoteEntry.js"
        │
        ├─▶ init({ name, remotes, plugins })             → FederationHost
        │     remotes : [{ name, entry }, …]
        │     plugins : [ RetryPlugin({ retryTimes: 3, retryDelay: 1000 }),
        │                 fallbackPlugin() ]
        │     → registered with the MF runtime, ZERO bytes fetched
        │
        ├─  window.__FEDERATION_LOADED = true            → boolean
        │
        └─▶ getGlobalFeatures().map(dynamicLoadStyles)   → Promise<boolean>[]
              └─▶ loadRemote(name + "/globals")          → Promise<unknown>
                    GET :3001/design-system/static/remoteEntry.js?t=…
                    GET :3002/layout/_next/static/chunks/remoteEntry.js?t=…
                    GET :3001/design-system/static/__federation_expose_globals.css
                    GET :3001/design-system/static/__federation_expose_globals.js
                    GET :3002/layout/_next/static/chunks/__federation_expose_globals.js
```

### 3. Per-page preload

```
<ModuleFederationProvider>                               → JSX.Element
  │                                                        <RemoteErrorBoundary>{children}</…>
  ├─▶ useRouter()                                        → NextRouter
  ├─▶ useModuleLoading()                                 → { loadModulesByRoute, moduleStatus }
  │     ├─ useState<Record<string, ModuleStatus>>        → moduleStatus
  │     └─ useRef<Set<string>>                           → requestedRef
  ├─  useState<string | null>                            → loadedForPath
  │
  └─▶ useEffect  [router.pathname changes]
        ├─  guard  loadedForPath === pathname            → return
        ├─  guard  isStale (cleanup)                     → return if the route changed meanwhile
        │
        ├─▶ waitForFederation(5000, 200)                 → Promise<boolean>
        │     polls window.__FEDERATION_LOADED every 200ms, gives up after 5 seconds
        │
        └─▶ loadModulesByRoute(route)                    → void
              │
              ├─▶ getModulesForRoute(route)              → string[]
              │     Object.values(featureRegistry)       → FeatureMetadata[]   (WITHOUT globalFeatures)
              │       .filter(f => f.routes.some(…))     → FeatureMetadata[]
              │       .map(f => f.name)                  → string[]
              │     └─▶ isRouteMatch(pattern, route, matchType) → boolean
              │           "exact"  → route === pattern
              │           "prefix" → route === pattern || route.startsWith(pattern + "/")
              │
              └─▶ loadModule(name)                       → Promise<void>   (void, all in parallel)
                    ├─  guard  requestedRef.has(name)    → return
                    ├─  requestedRef  Set {} → Set { name }
                    ├─  moduleStatus  {} → { name: "loading" }
                    ├─▶ dynamicLoadStyles(name)          → Promise<boolean>
                    │     └─▶ loadRemote(name + "/globals") → Promise<unknown>
                    └─  moduleStatus  → { name: "loaded" | "error" }
```

### 4. The actual render

```
pages/<feature>/<sub-page>/index.tsx
  └─▶ _app.tsx  Component.getLayout(<Page />)            → ReactNode
        │          fallback: (page) => page
        │
        └─▶ <DefaultLayout>   ← remoteComponent("duidtin_ui_layout/default")
              │
              │  remoteComponent(path, pick?)            → ComponentType
              │    called at IMPORT time → zero fetches
              │    loader runs at MOUNT  → only then it fetches
              │
              ├─▶ loadRemote("duidtin_ui_layout/default")   → Promise<unknown>
              │     → keys ["default"]
              │     GET :3002/layout/_next/.../__federation_expose_default.js
              │
              └─▶ <Page />
                    ├─▶ loadRemote(".../components/card")   → keys ["Card", "default"]
                    │     pick → mod.Card.Header | mod.Card.Body
                    └─▶ loadRemote(".../components/button") → keys ["Button", "default"]
                          GET :3001/design-system/static/__federation_expose_components__card.js
                          GET :3001/design-system/static/__federation_expose_components__button.js

  all of it goes through dynamic(loader, { ssr: false })  → a Loadable component
```

### 5. Error handling

```
script fetch fails (network)
  └─▶ RetryPlugin                      retry 3×, 1 second apart
        └─ still failing
             └─▶ fallbackPlugin        errorLoadRemote({ id, error }) hook
                   → { default: () => <Fallback moduleId={id} /> }
                      ▲ the SAME shape as a successful module, so next/dynamic
                        needs to know nothing about failure

module loaded SUCCESSFULLY, then CRASHES while rendering
  └─▶ RemoteErrorBoundary              getDerivedStateFromError(error)
        → state { error } → replacement UI
```
