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
- **Role** — 17 UI components + styles, each exposed individually
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

### 4. `duidtin-feature-beranda` — the home page

- **Port** — 3003
- **Framework** — Next.js 16.2.9
- **Bundler** — **Rspack** (`next-rspack` 16.2.9)
- **MF plugin** — `@module-federation/enhanced` 2.9.0
- **React** — 18.3.1 (must match the host)
- **Styling** — Tailwind v4, prefix `fber` (BEM + `@apply`, the same as the other repos)
- **Path** — `basePath: "/beranda"`
- **Role** — the home page: balance summary, approval queue, shortcuts. The first feature remote, so this repo is what makes PHASE 2 in the host actually run
- **Note** — Turbopack (Next 16's default) does not support MF, hence Rspack. `shared` must be written by hand — `enhanced` does not auto-share React the way `nextjs-mf` does

> Naming: `ui-*` for infrastructure (host, design system, layout), `feature-*` for business features.

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

Framework, bundler, MF plugin, TypeScript version, Tailwind prefix, port, `basePath`, even the package manager. The CSS prefixes are deliberately distinct (`app` / `ui` / `lyt` / `fber`) because all four render into a single page — without separate prefixes their Tailwind utility classes would collide.

The colours themselves do **not** differ: the palette, radii and shadows are defined once as `--dtn-*` CSS custom properties in the design system, then cascade to every repo through `:root`. Tailwind in each repo only handles layout.

What still differs between repos is **how the CSS reaches the browser**: Next forbids global CSS imports outside `_app.tsx`, while an MF-exposed module is not `_app.tsx`. The layout works around it with a custom webpack rule; beranda compiles the CSS into a string and injects it by hand.

> **Now proven:** `duidtin-feature-beranda` runs MF runtime **2.9.0** while the other three sit on **0.24.1**, and they do talk to each other — in both directions. The host (0.24.1) loads beranda (2.x), then beranda (2.x) loads the design system (0.24.1), all inside one render tree with no errors. Even cross-repo `dts` works: the design system's types are generated into `@mf-types/` on beranda's side automatically.

### Running it

Three terminals, remotes before the host:

```bash
cd duidtin-ui-design-system && bun install && bun run dev:producer   # :3001
cd duidtin-ui-layout        && bun install && bun run dev            # :3002
cd duidtin-feature-beranda  && bun install && bun run dev            # :3003
cd duidtin-ui               && bun install && bun run dev            # :3000 ← open this
```

If a remote isn't running the page still renders — the failed part is swapped for an error box by `fallbackPlugin` (section 5 below). That is the intended behaviour.


## Deploy

> **Status: not deployed yet.** This section is a decided plan. Items marked ☐ in the [checklist](#checklist-before-the-first-deploy) are not yet done in code.

### Topology: one domain, told apart by path

```
https://duidtin-ui.vercel.app/                                  → host project
https://duidtin-ui.vercel.app/layout/_next/static/…             → layout project
https://duidtin-ui.vercel.app/beranda/_next/static/…            → beranda project
https://duidtin-ui.vercel.app/design-system/static/…            → design-system project
```

This topology is **already locked in by the code**, not a free choice. In all three Next repos, `getBaseFederationUrl()` returns `window.location.origin` whenever it is not on localhost, so in production the host looks for every remote on its own domain. Publish each remote to its own domain and the host breaks immediately.

A single origin is also what keeps the next stage simple: session cookies and `localStorage` are shared by every remote automatically, and a backend can live at `/api` with no CORS.

### Same as qcash, different at the router layer

| | qcash | duidtin |
|---|---|---|
| One domain, remotes told apart by path | yes | yes |
| One repo = one independent deploy | a `Dockerfile` per repo | one Vercel project per folder |
| Mixed MF versions in production | host `0.18.1`, dhe `2.x` | host `0.24.1`, beranda `2.9` |
| **What unifies the domain** | **the OpenShift router** (infrastructure) | **rewrites in the host** |

The `qcash-ui` host does have `rewrites()`, but they only run in development — its comment reads *"Deployed envs are same-origin, so no rewrite is needed."* Vercel has no OpenShift router, so the host's rewrites take on that role. The browser cannot tell the difference.

A rewrite is **not a redirect**. The address bar never changes, and only JavaScript/CSS chunk files are routed — not pages. Layout, beranda and the design system are still composed inside a single page by Module Federation.

### Platform: Vercel Hobby, four projects from one repo

**Why Vercel:** free with no credit card, the repo is already on GitHub, and servers do not sleep when idle — a remote stuck in a *cold start* makes the host render error boxes.

**Why not the Vercel Microfrontends feature:** as of September 2026, the Hobby plan fits only **2 projects** per microfrontends group, and on Pro each extra project is **$250/month**. Duidtin needs 4. The URL shape is the same, so moving later only means swapping the rewrites for `microfrontends.json`, with no application code changes.

**Why not a single project:** one Vercel project builds one application from one root. The four applications use different toolchains, and independent deploys — the whole point of MFE — would disappear.

| Project | Root Directory | Framework | Build Command | Output Directory |
|---|---|---|---|---|
| `duidtin-ui-design-system` | `duidtin-ui-design-system` | Other | `bun run build:vercel` | `apps/producer/dist/mf` |
| `duidtin-ui-layout` | `duidtin-ui-layout` | Next.js | `bun run build` | *(default)* |
| `duidtin-feature-beranda` | `duidtin-feature-beranda` | Next.js | `bun run build` | *(default)* |
| `duidtin-ui` | `duidtin-ui` | Next.js | `bun run build` | *(default)* |

The Install Command for all four is `bun install`. The `build` scripts work as they are: `NEXT_PRIVATE_LOCAL_WEBPACK=true` is already in the host and layout scripts, and beranda's `prebuild` compiles Tailwind through the local binary.

The design system's settings live in `duidtin-ui-design-system/vercel.json` and override the dashboard fields. `build:vercel` builds the remote and Storybook together, and Storybook is served at `/storybook/` on the same domain. See the Storybook section of the design-system README for details.

So that a push touching one folder does not build all four, set **Settings → Git → Ignored Build Step** in every project:

```bash
git diff --quiet HEAD^ HEAD -- .
```

**Order of creating projects:** design-system → layout & beranda → host. The host comes last because its rewrites need the other three URLs.

### Host environment variables

| Env var | Value | Rewrite |
|---|---|---|
| `REMOTE_DESIGN_SYSTEM_URL` | the design system's `*.vercel.app` URL | `/design-system/static/:path*` → `…/:path*` |
| `REMOTE_LAYOUT_URL` | the layout's `*.vercel.app` URL | `/layout/:path*` → `…/layout/:path*` |
| `REMOTE_BERANDA_URL` | beranda's `*.vercel.app` URL | `/beranda/:path*` → `…/beranda/:path*` |
| `REMOTE_AUTH_URL` *(later)* | `duidtin-feature-auth` | `/auth/:path*` → `…/auth/:path*` |
| `BACKEND_URL` *(later)* | the backend | `/api/:path*` → `…/:path*` |

The design system differs from the other two: it is not Next and has no `basePath`, so its files sit at the root of its Vercel domain and its rewrite **strips** the `/design-system/static` prefix. The layout and beranda keep their prefixes.

In local dev these variables are empty, so the rewrites stay off and each remote is still reached directly on its own port.

### Checklist before the first deploy

- ☐ **Env-var-driven host rewrites**, active only when their variable is set.
- ☐ **`Cache-Control: no-cache` for `remoteEntry.js` and `mf-manifest.json`** in all three remotes. Their names stay the same across deploys; if cached, the browser uses a stale table of contents pointing at deleted chunks, producing `ChunkLoadError`.
- ☐ **`?gagal` and `?lambat` behind a `NEXT_PUBLIC_API_SIMULASI` flag.** Both are currently live in production too — anyone can take down beranda blocks through the URL.
- ☐ **Verify beranda's build before the host's.** `next-rspack` is still experimental, and Next 16 + Rspack on Vercel has no precedent — qcash deploys dhe through Docker.
- ☐ **Never set `MF_PUBLIC_PATH` in production env.** The `build` scripts deliberately leave it empty so asset paths stay relative to the single domain.

### Rules for the next remotes

**A remote's basePath must never collide with a host route.** Next rewrites run after host pages are checked but before dynamic routes. With a host route `/mutasi/[...slug]` alongside a basePath of `/mutasi`, a request for `/mutasi/_next/…` is captured by the host page and the remote fails to load with no clear message.

The correct shape for auth later: the **routes** `/login` and `/aktivasi` are host pages, while `duidtin-feature-auth`'s **asset basePath** is `/auth`.

If the `@duidtin/auth` package is published privately to GitHub Packages, every Vercel project needs an `NPM_TOKEN` env var so `bun install` can fetch it.

### Known risks

- **Old chunks disappear on redeploy.** A user whose page is still open requests the previous version's chunks and gets a 404. `RetryPlugin` and `fallbackPlugin` in the host soften the symptom; the real fix is keeping the previous build's assets around for a while.
- **PR previews do not compose automatically.** The host's rewrites point at production remotes, so a remote's preview is not picked up by the host's preview.

### If it later moves to a VPS + Docker + Caddy

The host's production rewrites are removed and Caddy takes over the router role — exactly like qcash with its OpenShift router. All three Next repos are already `output: "standalone"`, so they only need wrapping in containers.

```caddy
duidtin.com {
	@entry path */remoteEntry.js */mf-manifest.json
	header @entry Cache-Control "no-cache"

	handle_path /design-system/static/* {
		root * /srv/design-system
		file_server
	}
	handle /layout/*  { reverse_proxy layout:3002 }
	handle /beranda/* { reverse_proxy beranda:3003 }
	handle            { reverse_proxy host:3000 }
}
```

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
