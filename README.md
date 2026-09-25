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

### Shared package: `@duidtin/auth`

**Core + React done (15 tests passing), not yet used by any repo.** A package in [`duidtin-packages/auth`](duidtin-packages/auth/README.id.md), not a remote, so it has no Vercel project.

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
        └─ refresh refused               → store cleared → the host redirects to /login

other tabs
  └─▶ "storage" event → their store follows
```

| Export | Functions |
|---|---|
| `@duidtin/auth` | `configureAuth({ baseUrl })`, `installAuthStore()`, `getAuthStore()`, `http` (instance axios), `login()`, `logout()`, `logoutAll()`, `refreshProfile()` |
| `@duidtin/auth/react` | `useAuth()` → `{ user, status, isLoggedIn, login, logout, logoutAll, refreshProfile }` |
| `/vue`, `/svelte`, `/angular` | later; the core is framework-free, so each wrapper is a dozen lines |

- The session store is **created by the host only**; remotes borrow the object (`getState`, `subscribe`, actions) — no classes, no React, so it is safe across frameworks and bundlers.
- Business stores stay with each remote.
- The core never reads `process.env`; each app passes the base URL through `configureAuth()`.
- Full session contract: [README.be.id.md](README.be.id.md).

### What MUST match

| | Why |
|---|---|
| **React version** — 18.3.1 everywhere | it is `shared` as a singleton; two React instances on one page means an immediate `Invalid hook call` |
| **Container names** — `duidtin_ui_layout`, etc. | the exact string `loadRemote()` uses on the consumer side |
| **`exposes` keys** — `./base`, `./globals` | matched by hand across repos; nothing checks them |

### What MAY differ

| | host | design system | layout | beranda |
|---|---|---|---|---|
| Framework | Next 14 | no Next | Next 14 | Next 16 |
| Bundler | webpack | Rslib + Rsbuild | webpack | Rspack |
| MF plugin | `nextjs-mf` | `rsbuild-plugin` | `nextjs-mf` | `enhanced` |
| MF runtime | 0.24.1 | 0.24.1 | 0.24.1 | 2.9.0 |
| Tailwind prefix | `app` | `ui` | `lyt` | `fber` |
| Dev port | 3000 | 3001 | 3002 | 3003 |
| `basePath` | — | `/design-system/static` | `/layout` | `/beranda` |

The package manager and TypeScript version may differ too; right now they happen to match (bun).

**Tailwind prefixes must differ**, because all four render into one page. Without them, utility classes and theme variables (`--spacing`, `--color-*`) overwrite each other.

**Colours do not differ.** The palette, radii and shadows are written once as `--dtn-*` in the design system's `tokens.css`, then cascade to every repo through `:root`. Tailwind in each repo only handles layout.

**How the CSS reaches the browser** does differ, because Next forbids global CSS imports outside `_app.tsx` while an MF-exposed module is not `_app.tsx`:

| Repo | How |
|---|---|
| host | `import "@/styles/globals.css"` in `_app.tsx` |
| design system | exposes `./globals`, `loadRemote`d by the host in PHASE 1 |
| layout | exposes `./globals` + a webpack `style-loader` rule |
| beranda | CSS compiled into a string, injected by `ensureGlobalsStylesheet()` |

> **Now proven:** `duidtin-feature-beranda` runs MF runtime **2.9.0** while the other three sit on **0.24.1**, and they do talk to each other — in both directions. The host (0.24.1) loads beranda (2.x), then beranda (2.x) loads the design system (0.24.1), all inside one render tree with no errors. Even cross-repo `dts` works: the design system's types are generated into `@mf-types/` on beranda's side automatically.

### Running it

Four terminals, remotes before the host:

```bash
cd duidtin-ui-design-system && bun install && bun run dev:producer   # :3001
cd duidtin-ui-layout        && bun install && bun run dev            # :3002
cd duidtin-feature-beranda  && bun install && bun run dev            # :3003
cd duidtin-ui               && bun install && bun run dev            # :3000 ← open this
```

If a remote isn't running the page still renders — the failed part is swapped for an error box by `fallbackPlugin` (section 5 below). That is the intended behaviour.

**You don't have to run everything.** When changing one remote, run only that remote's server and open the production host with `?remote-lokal=name@port`. When changing the host, run it in `NEXT_PUBLIC_REMOTE_DARI=publish` mode. Details in the [host README](duidtin-ui/README.md#dev-without-running-every-server).


## Deploy

> **Status: all four projects are deployed.** The host is live at `https://super-apps-duidtin.vercel.app`, joining the remotes through rewrites. The design system (remote + Storybook) is live at `https://super-apps-duidtin-ui-system.vercel.app` (Storybook at `/storybook/`). The layout is live at `https://super-apps-duidtin-ui-layout.vercel.app/layout` (`remoteEntry.js` under `/layout/_next/static/chunks/`). Beranda is deployed; the host attaches it on `/` once `REMOTE_BERANDA_URL` is set. The rest of this section is a decided plan. Items marked ☐ in the [checklist](#checklist-before-the-first-deploy) are not yet done in code.

### Topology: one domain, told apart by path

```
https://super-apps-duidtin.vercel.app/                                  → host project
https://super-apps-duidtin.vercel.app/layout/_next/static/…             → layout project
https://super-apps-duidtin.vercel.app/beranda/_next/static/…            → beranda project
https://super-apps-duidtin.vercel.app/design-system/static/…            → design-system project
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

```
browser → super-apps-duidtin.vercel.app/layout/_next/static/chunks/remoteEntry.js
            └─▶ host rewrites → super-apps-duidtin-ui-layout.vercel.app/layout/_next/…
```

- **A rewrite is not a redirect.** The address bar does not change; only JS/CSS chunk files are routed, not pages.
- Composing the layout, beranda and design system still happens inside one page through Module Federation.
- qcash's host has `rewrites()` too, but only in development — its comment reads *"Deployed envs are same-origin, so no rewrite is needed."* There is no OpenShift router on Vercel, so the host's rewrites take that role.

### Platform: Vercel Hobby, four projects from one repo

| Project | Root Directory | Framework | Build Command | Output Directory |
|---|---|---|---|---|
| `duidtin-ui-design-system` | `duidtin-ui-design-system` | Other | `bun run build:vercel` | `apps/producer/dist/mf` |
| `duidtin-ui-layout` | `duidtin-ui-layout` | Next.js | `bun run build` | *(default)* |
| `duidtin-feature-beranda` | `duidtin-feature-beranda` | Next.js | `bun run build` | *(default)* |
| `duidtin-ui` | `duidtin-ui` | Next.js | `bun run build` | *(default)* |

| Item | Notes |
|---|---|
| Install Command | `bun install`, all four |
| Why not a single project | one project builds one application from one root; the different toolchains and independent deploys would be lost |
| The `build` scripts | usable as they are: `NEXT_PRIVATE_LOCAL_WEBPACK=true` is already in the host and layout scripts, and beranda's `prebuild` compiles Tailwind through the local binary |
| Design-system settings | in `duidtin-ui-design-system/vercel.json`, overriding the dashboard. `build:vercel` builds the remote and Storybook, served at `/storybook/` |
| Order of creating projects | design system → layout → host → beranda. The host went first because beranda was still static; `REMOTE_BERANDA_URL` must be set before the host build |

**Automatic builds on push**

```
push to main
  └─▶ EVERY connected project is triggered
        └─▶ each project's ignoreCommand:
              git diff --quiet "${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}" HEAD -- .
                ├─ exit 0   folder unchanged  → build SKIPPED
                └─ exit ≥1  changed / errored → build RUNS
```

| Item | Notes |
|---|---|
| Vercel's built-in skipping | does not apply: it requires `workspaces` in a root `package.json`, which this repo has not |
| `VERCEL_GIT_PREVIOUS_SHA` | that project's last successful deployment. `HEAD^` alone compares only the last commit, so a change in an earlier commit could be missed |
| Clone `--depth=10` | if the comparison commit falls outside that depth, `git diff` errors and the build runs. It fails safe |
| Shape in `vercel.json` | `"ignoreCommand": "git diff --quiet \"${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}\" HEAD -- ."` |
| Status | set in all four folders. The design system also keeps its build settings there; the other three hold only `ignoreCommand` |
| Manual redeploy | the same commit is skipped too. Untick **Use project's Ignore Build Step** |
| Remote → host | a remote need not trigger a host build; the host reads the latest `remoteEntry.js` at runtime |

### Host environment variables

| Env var | Contents | Rewrite |
|---|---|---|
| `REMOTE_DESIGN_SYSTEM_URL` | the design system's `*.vercel.app` URL | `/design-system/static/:path*` → `…/:path*` |
| `REMOTE_LAYOUT_URL` | the layout's `*.vercel.app` URL | `/layout/:path*` → `…/layout/:path*` |
| `REMOTE_BERANDA_URL` | beranda's `*.vercel.app` URL | `/beranda/:path*` → `…/beranda/:path*` |
| `REMOTE_AUTH_URL` *(later)* | `duidtin-feature-auth` | `/auth/:path*` → `…/auth/:path*` |
| `BACKEND_URL` *(later)* | the backend | `/api/:path*` → `…/:path*` |

- **The design system's prefix is stripped**, because it is not Next and has no `basePath`: its files sit at the root of its Vercel domain. The layout and beranda keep their prefixes.
- **Local dev:** the variables are empty → no rewrites → remotes are reached through their own ports.

### Checklist before the first deploy

| | Item | Notes |
|---|---|---|
| ☑ | Env-var-driven host rewrites | in `duidtin-ui/next.config.mjs`, active only when the variable is set. Verified locally against the live design system and layout: every request goes through one origin. Changing a variable means redeploying the host with Ignore Build Step unticked |
| ☑ | `remoteEntry.js` caching | no extra header needed after all — see the table below |
| ☐ | `?gagal` and `?lambat` behind `NEXT_PUBLIC_API_SIMULASI` | both are live in production too; anyone can take down beranda blocks through the URL |
| ☐ | Verify beranda's build before the host's | `next-rspack` is still experimental, and Next 16 + Rspack on Vercel has no precedent |
| ☐ | Never set `MF_PUBLIC_PATH` in production env | so asset paths stay relative to the single domain |

The caching concern: `remoteEntry.js` keeps its name across deploys, so a cached copy could point at chunks that no longer exist (`ChunkLoadError`). What the deployed remotes actually send:

| Remote | Header sent | Why it is still safe |
|---|---|---|
| design system | `max-age=0, must-revalidate` | Vercel's default for static files |
| layout, beranda | `public,max-age=31536000,immutable` | Next applies it to everything under `_next/static` |
| both | — | the host never requests the bare URL: `runtimePlugin.cjs` (the `beforeRequest` hook) appends `?t=Date.now()` on every page load. The host never requests `mf-manifest.json` at all |

Still unconfirmed: that in the production host's Network tab, the layout's and beranda's `remoteEntry.js` really are requested with `?t=`.

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

### Known risks

| Risk | Impact | Mitigation |
|---|---|---|
| Old chunks disappear on redeploy | a page left open requests the previous version's chunks → 404 | `RetryPlugin` + `fallbackPlugin` in the host. The real fix is keeping the previous build's assets around for a while |
| PR previews are not composed automatically | a remote's preview is not used by the host's preview | the host's rewrites point at production remotes |

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
