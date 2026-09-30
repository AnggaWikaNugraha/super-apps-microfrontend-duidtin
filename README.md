# x-duidtin

**English** · [Bahasa Indonesia](README.id.md)

A Module Federation-based microfrontend super-app.

## Six repos, six Vercel projects

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
- **Role** — 18 UI components + styles, each exposed individually. 11 of them are also available as `<dtn-*>` Web Components for non-React consumers (Vue/Svelte/Angular), running the same React components and the same CSS
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
- **Framework** — **Vue 3.5** — the only repo that is not React
- **Bundler** — **Rsbuild 1.x** (no Next: neither routing nor SSR is needed)
- **MF plugin** — `@module-federation/rsbuild-plugin` 0.24.1
- **React** — **not installed**; design-system components are used through the `<dtn-*>` Web Component wrappers
- **Styling** — Tailwind v4, prefix `fber` (BEM + `@apply`, the same as the other repos)
- **Path** — `/beranda` (`server.base` + `assetPrefix`)
- **Role** — the home page: balance summary, approval queue, shortcuts. The first feature remote, so this repo is what makes PHASE 2 in the host actually run
- **Note** — what it exposes is **not a component** but a `mount(el)` function, because React cannot render a Vue component. The host calls it through `components/federation/remote-mount.tsx`. The session stays single through `@duidtin/auth/vue` — the very same store as the host

### 5. `duidtin-feature-auth` — login

- **Port** — 3004
- **Framework** — Next.js 16.2.9
- **Bundler** — **Rspack** (`next-rspack` 16.2.9)
- **MF plugin** — `@module-federation/enhanced` 2.x
- **React** — 18.3.1 (must match the host)
- **Styling** — Tailwind v4, prefix `fath`
- **Path** — `basePath: "/auth"`
- **Role** — the login page (`./login`) and the session-expired modal (`./sesi-berakhir`): email/password form, `login()` from `@duidtin/auth`, renders `AuthError`
- **Note** — the only feature remote that fully works when opened on its own (`:3004`), because the auth package creates a fallback store. `pages/index.tsx` must use `dynamic()` as an async boundary — see the [repo README](duidtin-feature-auth/README.id.md)

### 6. `duidtin-api` — the backend

- **Port** — 4000
- **Runtime** — Bun in dev, Node.js (a Vercel Function) in production
- **Stack** — Express 5 · Mongoose 8.24.4 (pinned) · Zod 4 · JWT HS256 · bcryptjs
- **Database** — MongoDB Atlas
- **Path** — **none**: reached directly on its own domain, not through a host rewrite
- **Role** — the auth API (`login`, `refresh`, `logout`, `logout-semua`, `me`) plus the home-page data (`GET /beranda/rekening`, `/persetujuan`, `/aktivitas` — read-only, all require a session)
- **Note** — the only part that is **not** Module Federation. The frontend calls it through `NEXT_PUBLIC_API_URL`, and the frontend's origin must be listed in the API's `CORS_ORIGINS`. Details in [README.be.id.md](README.be.id.md) and [duidtin-api/README.id.md](duidtin-api/README.id.md)

> Naming: `ui-*` for infrastructure (host, design system, layout), `feature-*` for business features.

The three most striking differences above are deliberate, not accidental:

- **The design system uses no Next at all.** It is only a component library — no routing, no SSR needed. Rslib produces a leaner bundle for that job.
- **The layout uses Next** because it will eventually bridge application context (auth, role-based menus), not merely render components.
- **Beranda uses Vue, not React.** This is the experiment that goes furthest: proving a remote may differ in framework, not merely in bundler. The components are still the same design-system components — through the `<dtn-*>` wrappers — and the session is still one store. Rsbuild was chosen over Vite so that the MF version matches the design system's exactly, 0.24.1.

### Shared package: `@duidtin/auth`

**Core + React + Vue done (25 tests passing). Used by the host (store, guard, session-expired modal), by `duidtin-feature-auth` (login + re-login), and by `duidtin-feature-beranda` (the greeting comes from the session, through the `/vue` subpath); the layout is not wired yet.** A package in [`duidtin-packages/auth`](duidtin-packages/auth/README.id.md), not a remote, so it has no Vercel project.

```
host boot — _app.tsx, before federationInit()
  └─▶ installAuthStore()  create the store (zustand/vanilla) → hydrate localStorage["duidtin:sesi"]
                          → window.__DUIDTIN_AUTH__

remote (layout, beranda, auth)
  └─▶ getAuthStore()      borrow the host's store
                          no global (repo opened on its own in dev) → create a local store

login — the auth remote
  └─▶ login(email, password) → POST /auth/login → fill the store → store writes localStorage
                          → every subscribed component updates

fetching data — any remote
  └─▶ http.get("/beranda/rekening")        axios instance, interceptors ship with the package
        ├─ access token has < 30s left   → refresh first
        ├─ 401 TOKEN_KEDALUWARSA         → refresh → retry ONCE
        ├─ any other failure             → thrown as AuthError
        └─ refresh refused               → status "kedaluwarsa" → requests are HELD

session ends (1 day after login, or refresh refused)
  └─▶ status "kedaluwarsa", the user's name and email are still remembered
        ├─ the host layers the re-login modal on top (auth remote, ./sesi-berakhir)
        ├─ the page is NOT discarded, there is no redirect
        └─ correct password → held requests resume with the new token

other tabs
  └─▶ "storage" event → their store follows
```

| Export | Functions |
|---|---|
| `@duidtin/auth` | `configureAuth({ baseUrl })`, `installAuthStore()`, `getAuthStore()`, `http` (instance axios), `login()`, `logout()`, `logoutAll()`, `refreshProfile()` |
| `@duidtin/auth/react` | `useAuth()` → `{ user, status, isLoggedIn, sesiKedaluwarsa, penggunaTerakhir, login, logout, logoutAll, refreshProfile }` |
| `@duidtin/auth/vue` | `useAuth()` → the same keys, but as **refs** (`status.value`); used by `duidtin-feature-beranda` |
| `/svelte`, `/angular` | later; the core is framework-free, so each wrapper is ~25 lines — exactly like `/vue` |

- The session store is **created by the host only**; remotes borrow the object (`getState`, `subscribe`, actions) — no classes, no React, so it is safe across frameworks and bundlers.
- Business stores stay with each remote.
- The core never reads `process.env`; each app passes the base URL through `configureAuth()`.
- Full session contract: [README.be.id.md](README.be.id.md).

## Deploy

> **Status: six projects deployed.**

| Project | URL | Note |
|---|---|---|
| host | `https://super-apps-duidtin.vercel.app` | joins every remote through rewrites |
| design system | `https://super-apps-duidtin-ui-system.vercel.app` | Storybook at `/storybook/` |
| layout | `https://super-apps-duidtin-ui-layout.vercel.app/layout` | `remoteEntry.js` under `/layout/_next/static/chunks/` |
| beranda | deployed | `/beranda/*` still 404 — `REMOTE_BERANDA_URL` on the host is not right yet |
| auth | `https://super-apps-duidtin-feature-auth.vercel.app` | the host's `/login` already renders its form |
| api | `https://super-apps-duidtin-api-eta.vercel.app` | `/health` → `db: "terhubung"`, login 200 |

Still outstanding: `NEXT_PUBLIC_API_URL` is not set on the host and auth projects, so the production login page still calls `http://localhost:4000`.

### Topology: one domain, told apart by path

```
https://super-apps-duidtin.vercel.app/                                  → host project
https://super-apps-duidtin.vercel.app/layout/_next/static/…             → layout project
https://super-apps-duidtin.vercel.app/beranda/_next/static/…            → beranda project
https://super-apps-duidtin.vercel.app/design-system/static/…            → design-system project
https://super-apps-duidtin.vercel.app/auth/_next/static/…               → auth project
```

**The backend does NOT follow this pattern.** `duidtin-api` is reached directly on its own
domain (`https://super-apps-duidtin-api-eta.vercel.app`), not through an `/api` rewrite. Two
consequences: its URL is supplied through the `NEXT_PUBLIC_API_URL` env in every bundle that
calls it, and the host's origin must be listed in the API's `CORS_ORIGINS`.

This topology is **already locked in by the code**, not a free choice. In all three Next repos, `getBaseFederationUrl()` returns `window.location.origin` whenever it is not on localhost, so in production the host looks for every remote on its own domain. Publish each remote to its own domain and the host breaks immediately.

A single origin is also what keeps sessions simple: `localStorage` is shared by every remote automatically — which is why one session store on `window.__DUIDTIN_AUTH__` covers the whole page.

### Host environment variables

| Env var | Contents | Rewrite |
|---|---|---|
| `REMOTE_DESIGN_SYSTEM_URL` | the design system's `*.vercel.app` URL | `/design-system/static/:path*` → `…/:path*` |
| `REMOTE_LAYOUT_URL` | the layout's `*.vercel.app` URL | `/layout/:path*` → `…/layout/:path*` |
| `REMOTE_BERANDA_URL` | beranda's `*.vercel.app` URL | `/beranda/:path*` → `…/beranda/:path*` |
| `REMOTE_AUTH_URL` | `duidtin-feature-auth` | `/auth/:path*` → `…/auth/:path*` |
| `NEXT_PUBLIC_API_URL` | the `duidtin-api` URL | **no rewrite** — read by `configureAuth()` in the host bundle. Remotes that call the API set it for themselves too (`duidtin-feature-auth`) |

- **The design system's prefix is stripped**, because it is not Next and has no `basePath`: its files sit at the root of its Vercel domain. The layout and beranda keep their prefixes.
- **Local dev:** the variables are empty → no rewrites → remotes are reached through their own ports.

### Rules for the next remotes

**A remote's basePath must not collide with a host route.** Next runs rewrites after host pages are checked, but before dynamic routes:

```
host has route /mutasi/[...slug]   +   remote basePath /mutasi
  └─▶ /mutasi/_next/… is caught by the host page → the remote fails to load, with no clear message
```

The correct shape for auth later: the **routes** `/login` and `/aktivasi` are host pages, while `duidtin-feature-auth`'s **asset basePath** is `/auth`.

Distributing the `@duidtin/auth` package — two stages, never both at once:

```
STAGE 1 — local path (now)
  duidtin-packages/auth ──file:../duidtin-packages/auth──▶ host, layout, beranda, auth
    change the package → save → the next build already uses it

STAGE 2 — GitHub Packages (later)
  duidtin-packages/auth ──tag──▶ publish ──▶ registry ──"@duidtin/auth": "^0.1.0"──▶ each repo
    change the package → bump → publish → raise the version in each consumer
```

| | Stage 1 | Stage 2 |
|---|---|---|
| Needs | Vercel's "include files outside the root directory", a package-building `prebuild`, `ignoreCommand` also watching the package folder | a `@duidtin` scope in `bunfig.toml`, an `NPM_TOKEN` env per Vercel project, a publish workflow |
| Version per repo | always the latest | pinned individually |
| Trigger to move | — | a remote holds back an older version, another team uses the package, or the package moves to its own repo |

```
MIGRATION (once)
  1. publishConfig + repository in duidtin-packages/auth/package.json
  2. GitHub Actions workflow: publish on tag (GITHUB_TOKEN)
  3. publish 0.1.0
  4. each consumer: file:… → ^0.1.0 + the @duidtin scope in bunfig.toml
  5. each Vercel project: NPM_TOKEN env (a read:packages PAT)
  6. drop the package-building prebuild + ../duidtin-packages/auth from ignoreCommand
     └─ repo by repo is fine; don't leave it long, versions drift unnoticed
```

After stage 2, daily iteration without publishing:

```bash
cd duidtin-packages/auth && bun link          # once
cd ../../duidtin-ui      && bun link @duidtin/auth
# laptop → local copy, Vercel → registry; undo with bun unlink
```

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

## Feature flags

Not used yet. Written down here because this is what will be used once **turning a feature on or off without deploying** is needed — a kill switch when production misbehaves, say, or opening a feature to one role only.

Until then, two approaches are enough and need no tooling at all:

- **A whole remote** is hidden by leaving it out of the host's `featureRegistry`. This has already been used: beranda was detached so the host could be deployed first.
- **A part inside one remote** (e.g. `search` v1 → v2) is split behind a single custom hook, then selected with `process.env.NEXT_PUBLIC_*`. Because the value is inlined at build time, the dead branch is dropped by the minifier and never ships to users.

The design, if it is ever built in `duidtin-api`:

1. **Storage:** one `konfigurasi` collection in MongoDB.
2. **Endpoint:** `GET /konfigurasi`, short cache (30–60 seconds), response shaped like every other `ApiResponse<T>`.
3. **Client read:** fetched once at boot. **Default off** while loading or when the request fails — a new feature must fail safe.
4. **How to change it:** a CLI script in `duidtin-api` (e.g. `bun run flag pencarianV2 on`). An admin page can follow if it is really needed.
5. **Per user or role:** carry it in `/auth/me`, which the frontend already calls to refresh what it displays.

Two things specific to MFE that are easy to miss:

- **Flag values arrive asynchronously**, while `featureRegistry` is read **synchronously** in PHASE 1. So flag checks belong at the page or component level, not in the host registry.
- **Flag lifetime.** Write down when a flag must be deleted. Forgotten rollout flags pile up, and every flag doubles the code paths that need testing.

Flags control what is shown, not what is allowed. Features touching sensitive data must still be refused by the backend through roles, because anyone can call the endpoint directly.

## Architecture map

Who loads whom, and on which stack — the repository as it stands today.

```
User
   │
   ▼
duidtin-ui — HOST                         Next 14.2 · webpack 5 · nextjs-mf 8.8.54 · MF runtime 0.24.1
   │                                      a thin shell — renders no UI of its own
   │
   │  loaded at runtime via remoteEntry.js
   ├─▶ duidtin-ui-layout                  Next 14.2 · webpack 5 · nextjs-mf 8.8.54 · MF 0.24.1
   ├─▶ duidtin-feature-beranda            Vue 3.5 · Rsbuild · rsbuild-plugin 0.24.1
   │                                      ↑ the only remote that is not React
   ├─▶ duidtin-feature-auth               Next 16.2 · Rspack (next-rspack) · enhanced 2.x · MF 2.x
   │        │
   │        └─ loadRemote, from all three
   │             ▼
   │           duidtin-ui-design-system   Turborepo: apps/producer + packages/ui
   │                                      Rslib 0.19 · rsbuild-plugin 0.24.1 · MF 0.24.1
   │
   └─ imported at build time, from host + beranda + auth
        ▼
      @duidtin/auth                       file:../duidtin-packages/auth
        │                                 a plain package, NOT a remote — each repo bundles its own copy
        │                                 tsc only, no bundler · zustand 5 (vanilla) + axios 1
        │
        └─ HTTPS + Bearer
             ▼
           duidtin-api                    Express 5 · Mongoose 8.24.4 (pinned) · Zod 4
                                          JWT HS256 · bcryptjs · MongoDB Atlas
```

Solid arrows = **Module Federation**, loaded at runtime. `imported at build time` = an ordinary `file:` dependency — `@duidtin/auth` is not a remote, so every repo bundles its own copy and all they share is the store on `window`. Per-repo stack details are in [Six repos, six Vercel projects](#six-repos-six-vercel-projects) above.

Three things the picture cannot show, yet decide everything:

| Thing | What it means |
|---|---|
| The host does **not** use the design system | it is a thin shell that renders no UI of its own; the DS is consumed by the layout and by each feature remote |
| `@duidtin/auth` is not a remote | it is an ordinary package imported at build time, so every bundle carries its own copy of the code. The only singleton is the **store object**, parked on `window.__DUIDTIN_AUTH__` by the host |
| Component types travel in an archive | the design system builds `@mf-types.zip`; each consumer downloads it (`bun run tipe`) and uses the real types instead of hand-copying props |
| There is only one arrow to the API | every token-bearing request goes through that package's `http` instance — token, refresh, retry and hold-and-replay all live in one place |

Where each piece stands today:

| Piece | Code | Production |
|---|---|---|
| host, layout, design system | ✅ | ✅ live |
| auth remote | ✅ login + session-expired modal | ✅ live, the host's `/login` already renders its form |
| beranda | ✅ UI, **data still mocked** | ⚠️ `REMOTE_BERANDA_URL` is wrong → `/beranda/*` 404 |
| `duidtin-api` | ✅ auth complete, no data endpoints yet | ✅ live, `/health` → `db: "terhubung"` |
| FE → API wiring | — | ⚠️ `NEXT_PUBLIC_API_URL` is unset on host & auth → production login still calls `localhost:4000` |

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
