# duidtin-ui

**English** · [Bahasa Indonesia](README.id.md)

The super-app host (shell). It owns routing, registers every remote with the Module Federation runtime, and composes pieces from other repos into a single page. On its own it **sells nothing** — everything you see on screen comes from a remote.

## Getting started

The host renders no UI of its own — everything comes from remotes. What you need to run depends on the page you want to open:

| To open | Servers that must be running |
|---|---|
| `/` (beranda) | design system `:3001`, layout `:3002`, beranda `:3003` (Vue), host `:3000` |
| `/login` | design system `:3001`, auth `:3004`, host `:3000` |
| a real login | + `duidtin-api` `:4000` |

```bash
cd ../duidtin-ui-design-system && bun install && bun run dev:producer   # :3001
cd ../duidtin-ui-layout        && bun install && bun run dev            # :3002
cd ../duidtin-feature-beranda  && bun install && bun run dev            # :3003
cd ../duidtin-feature-auth     && bun install && bun run dev            # :3004
cd ../duidtin-api              && bun install && bun run dev            # :4000
cd ../duidtin-ui               && bun install && bun run dev            # :3000 ← open this
```

The host also uses the local `@duidtin/auth` package (`file:../duidtin-packages/auth`). `bun install` here copies it; if the package changes, run `bun install` again — see [Session](#session-duidtinauth).

`bun run build` for a production build, `bun run check-types` for `tsc --noEmit`.

If a remote isn't running the page **still renders** — the failed part is replaced by a red box from `fallbackPlugin` (see PHASE 4). That is the intended behaviour, not a bug.

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
      remote-lokal.ts    # layer B: the ?remote-lokal override
      loader.ts          # dynamicLoadStyles(name)
  components/
    federation/
      provider.tsx       # PHASE 2: waitForFederation + per-route warm-up
      hooks/useModuleLoading.ts
    auth/GuardSesi.tsx           # session guard for every page, mounted in _app.tsx
    auth/ModalSesiBerakhir.tsx   # loadRemote("duidtin_feature_auth/sesi-berakhir"),
                                 # the exception: it can appear on any page
    remote/index.tsx     # bridge for INFRASTRUCTURE remotes only (the layout).
                         # FEATURE remotes are declared in their own pages/ file
    federation/remote-mount.tsx  # bridge for remotes that are NOT React (beranda is Vue):
                                 # gives them a <div> and calls their mount(el)
    ui/RemoteErrorBoundary.tsx   # PHASE 4, layer 3
    ui/PenandaRemoteLokal.tsx    # badge shown while a local remote is active
  utils/index.ts         # getBaseFederationUrl() — environment detection
  utils/rute.ts          # tujuanSetelahLogin(?dari) — internal paths only
  pages/
    _app.tsx             # PHASE 1 is kicked off here + provider + getLayout
    index.tsx            # PHASE 3 — beranda + layout, header driven by useAuth()
    login.tsx            # PHASE 3 — the auth remote, deliberately WITHOUT getLayout
  styles/globals.css     # tailwind prefix(app)
  types/global.d.ts      # window.__FEDERATION_LOADED, __DUIDTIN_REMOTE_ENTRY__, __DUIDTIN_AUTH__
  module-federation.config.mjs
  next.config.mjs        # production rewrites (from env) + react aliased to the host's node_modules
  vercel.json            # ignoreCommand only: skip the Vercel build when this folder is unchanged
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

## Session (`@duidtin/auth`)

The host is the **only** place that creates the session store. It is installed in [`pages/_app.tsx`](pages/_app.tsx), at the top level, **before** `federationInit()`:

```
_app.tsx (client-only, before React renders)
  ├─ configureAuth({ baseUrl })   ← NEXT_PUBLIC_API_URL, defaults to http://localhost:4000
  ├─ installAuthStore()           ← create the store, hydrate localStorage["duidtin:sesi"],
  │                                 listen for "storage", park it on window.__DUIDTIN_AUTH__
  └─ federationInit()             ← only now may remotes load
```

**That order is mandatory.** A remote calls `getAuthStore()` as soon as it loads; if the global isn't there yet it creates its own fallback store and the session splits in two.

| Thing | Host | Remote |
|---|---|---|
| `installAuthStore()` | yes, once | never |
| `configureAuth({ baseUrl })` | yes | yes — `baseUrl` is module state, each bundle has its own copy |
| React provider | none | none — the store is read through `useSyncExternalStore`, not Context |

| Env | Meaning |
|---|---|
| `NEXT_PUBLIC_API_URL` | base URL of `duidtin-api`. Empty → `http://localhost:4000` |

The package is installed through a local path (`"@duidtin/auth": "file:../duidtin-packages/auth"`). `bun` **copies** it at install time rather than linking, so after changing the package: `bun run build` there, then `bun install` here. The host's `prebuild` does both automatically on `bun run build`.

Verified in a real browser (headless Chrome, `publish` mode): `window.__DUIDTIN_AUTH__` exists, status is `"unauthenticated"` when empty, and after filling `localStorage["duidtin:sesi"]` and reloading → status `"authenticated"` with `pengguna.nama` readable.

The `/login` page, the guard and the header now use the session — see **Session flow in the host** below.

### Session flow in the host

```
/  (or any other private page)
  └─ GuardSesi (components/auth/GuardSesi.tsx, mounted in _app.tsx)
       ├─ status "loading"          → hold the render, do NOT redirect (hydration unfinished)
       ├─ status "unauthenticated"  → /login?dari=<the page that was requested>
       ├─ status "authenticated"    → render the page
       └─ status "kedaluwarsa"      → KEEP the page, layer the re-login modal on top
                                      (components/auth/ModalSesiBerakhir.tsx → auth remote)

/login
  └─ pages/login.tsx  loadRemote("duidtin_feature_auth/login")   ← NO getLayout
       ├─ onSuccess  → router.replace(?dari) — redirecting is the HOST's job
       └─ already signed in → GuardSesi bounces back to ?dari (or "/")

Sign-out button in the header
  └─ pages/index.tsx  logout() → store cleared → GuardSesi sends you to /login

the session expires while the page is open (1 day after login)
  └─ timer in @duidtin/auth → status "kedaluwarsa"
       ├─ THE PAGE IS NOT DISCARDED and there is no redirect — its content stays on screen
       ├─ the modal asks for the password (name and email already filled in)
       └─ held requests resume by themselves once the password is correct
```

**Why `kedaluwarsa` is not redirected.** Sending the user to `/login` would throw away the
page they were working on. The auth package holds the failed requests, so one password entry
restores everything — the same behaviour as qcash's *Session Expired* modal, except the trigger
is a status change in the shared store rather than a DOM event.

`?dari` is filtered by [`utils/rute.ts`](utils/rute.ts): only internal paths are accepted, so `/login?dari=https://evil.example` cannot bounce a user to another site.

| Env | Meaning |
|---|---|
| `NEXT_PUBLIC_API_URL` | base URL of `duidtin-api`. Empty → `http://localhost:4000` |
| `REMOTE_AUTH_URL` | the Vercel URL of `duidtin-feature-auth`, for the `/auth/:path*` rewrite (remote ASSETS; the login page itself stays the host route `/login`) |

**React is forced to a single copy through a webpack alias.** `@duidtin/auth` is installed from a local path and carries its own `zustand`; without the alias in `next.config.mjs` the build dies with `Can't resolve 'react' in …/duidtin-packages/auth/node_modules/zustand/esm` (or, if React were installed there, two React instances → `Invalid hook call`).

Verified in a browser with four local servers (host, layout, design system, auth):

| Test | Result |
|---|---|
| Open `/` with no session | redirected to `/login?dari=%2F`, the login form (2 fields) from the auth remote renders |
| Open `/login` with a session | bounced to `/`, the header shows `Angga Wika` from the session |
| Click sign out in the header | session and `localStorage` cleared, back to `/login` |
| Session expires while the page is open | stays on `/`, the header is still there, the **Sesi berakhir** modal appears with name + email prefilled |
| The modal's sign-out button | the modal disappears, the last-user record is dropped, and we move to `/login` |

## Architecture flow

Five phases that run at **different times**. The two easiest to confuse: PHASE 2 and PHASE 3 both run on every navigation, but only PHASE 3 puts anything on screen. And PHASE 0 runs long before the browser is involved — anything decided there needs a redeploy to change.

```
PHASE 0  Build time         → once, during `next build`
PHASE 1  Boot                → once, when the browser first loads the host bundle
PHASE 2  Per-route preload   → on every navigation (warm-up, NOT render)
PHASE 3  The actual render   → on every navigation (THIS is what appears on screen)
PHASE 4  Error handling      → any time something fails, in any phase
```

### PHASE 0 — Build time (`next.config.mjs` → `module-federation.config.mjs`)

What is decided here **cannot be changed without a redeploy**. Four things get locked into the bundle:

```
bun run build
  │
  ├─▶ prebuild: (cd ../duidtin-packages/auth && bun install && bun run build) && bun install
  │     @duidtin/auth is installed through `file:`, and its `dist/` is not in git
  │     → it must be built FIRST, or the host build fails to resolve the import
  │
  └─▶ next build
        ├─▶ rewrites()              reads REMOTE_*_URL → the proxy rules are WRITTEN into the bundle
        │     env empty → the rule is never created → that path 404s
        │
        ├─▶ NEXT_PUBLIC_API_URL     baked into the configureAuth() call in _app.tsx
        │
        ├─▶ resolve.alias           react + react-dom → the HOST's node_modules, for every requester
        │     without it: "Can't resolve 'react' in …/duidtin-packages/auth/node_modules/zustand/esm"
        │
        └─▶ NextFederationPlugin(federationConfig)
              name: "duidtin_ui" · filename: "static/chunks/remoteEntry.js"
              remotes: {}   ← EMPTY, resolved in PHASE 1
              exposes: {}   ← permanently empty, the host is only a consumer
              shared:  {}   ← nextjs-mf already shares react/react-dom/next on its own
```

Three consequences that bite often:

| What changed | Is a restart enough? |
|---|---|
| `REMOTE_*_URL` | ❌ **redeploy** — rewrites are locked at build time |
| `NEXT_PUBLIC_API_URL` | ❌ **redeploy** — the value is baked into `configureAuth()` |
| The remote list in `registry.ts` | ❌ redeploy too, but not because of MF: it is ordinary code that gets bundled |
| A remote's URL during dev (`?remote-lokal`) | ✅ runtime, kept in `localStorage` — that is what layer B in PHASE 1 is for |

That empty `remotes: {}` is what makes the last row possible: if the remote list lived in this config, adding one remote would mean rebuilding the host. Because it is empty, the list is decided by ordinary JS in PHASE 1 — and that code is free to read `window.location`, `localStorage`, anything, at the moment the page opens.

### PHASE 1 — Boot (`pages/_app.tsx` → `services/federation/init.ts`)

```
pages/_app.tsx (top level, client only, before React renders anything)
  └─▶ federationInit()                          → Promise<void>
        ├─▶ getAllFeatures()                     → FeatureMetadata[]
        ├─▶ getModuleEntry(name)                 → string   (a complete URL)
        │     ├─▶ getFeatureByName(name)          → FeatureMetadata | undefined
        │     └─▶ getFeatureEntryUrl(feature)     → string
        │           └─▶ getBaseFederationUrl(devOrigin) → string
        │                                            [reads the browser hostname NOW]
        ├─▶ init({ name, remotes, plugins })      → FederationHost  (ignored)
        │     → registers every remote with the MF runtime. NOTHING fetched yet.
        ├─▶ window.__FEDERATION_LOADED = true     → boolean, the green light for PHASE 2
        └─▶ dynamicLoadStyles(name)               → Promise<boolean>
              └─▶ loadRemote(name + "/globals")   → Promise<unknown>
                                                     THE REAL FETCH, prevents FOUC
```

Below, each step is broken down: **what it returns, and what the data looks like.** Every concrete value was captured from an actual runtime, not read off the types.

#### 1. `getAllFeatures()` → `FeatureMetadata[]`

Takes no arguments. It merely merges two sources:

```ts
[...globalFeatures, ...Object.values(featureRegistry)]
```

What it returns today — 2 global + 2 features:

```ts
[
  { name: "duidtin_ui_design_system",
    entryPath: "/design-system/static/remoteEntry.js",
    devOrigin: "http://localhost:3001",
    routes: [] },
  { name: "duidtin_ui_layout",
    entryPath: "/layout/_next/static/chunks/remoteEntry.js",
    devOrigin: "http://localhost:3002",
    routes: [] },
  { name: "duidtin_feature_auth",
    entryPath: "/auth/_next/static/chunks/remoteEntry.js",
    devOrigin: "http://localhost:3004",
    routes: ["/login"],
    matchType: "exact" },         // ← only /login, not /login/anything
  { name: "duidtin_feature_beranda",
    entryPath: "/beranda/static/remoteEntry.js",   // ← Rsbuild, not Next: no _next/static/chunks
    devOrigin: "http://localhost:3003",
    routes: ["/"] },              // ← this one is per-feature, not global
]
```

> **`routes: []` does not mean "not registered".** This function deliberately takes **both global AND per-feature**. `featureRegistry` currently holds 2 features, so this returns 4 items and all four get registered. The only thing separating global from per-feature is step 5 below.

#### 2. `getModuleEntry(name)` → `string`

This is not one function but a **chain of functions** in two layers: the local override (layer B) is checked first, then environment detection (layer A). Called once per remote:

```
getModuleEntry("duidtin_ui_layout")                     → string
  ├─▶ getFeatureByName("duidtin_ui_layout")             → FeatureMetadata | undefined
  │     └─▶ getAllFeatures().find(f => f.name === name)
  ├─▶ (guard) if undefined → THROW
  ├─▶ bacaRemoteLokal()[name]                           → string | undefined   ← layer B
  │     └─ present → `${localOrigin}${feature.entryPath}`, done
  └─▶ getFeatureEntryUrl(feature)                        → string              ← layer A
        └─▶ getBaseFederationUrl(feature.devOrigin)      → string
```

##### 2a. `getFeatureByName(name: string)` → `FeatureMetadata | undefined`

| | |
|---|---|
| **Parameter** | `name: string` — the container name, in **underscore** form |
| **Example input** | `"duidtin_ui_layout"` |
| **Returns** | the whole registry object, or `undefined` if not found |

```ts
// in:  "duidtin_ui_layout"
// out:
{
  name:       "duidtin_ui_layout",
  entryPath:  "/layout/_next/static/chunks/remoteEntry.js",
  devOrigin:  "http://localhost:3002",
  routes:     [],
}
```

It is implemented as `getAllFeatures().find(...)`, so every call **rebuilds the array** and then scans it linearly. With 2 remotes that is invisible; just keep it in mind once `featureRegistry` holds dozens of entries.

##### 2b. The guard in `getModuleEntry` — why it **throws** instead of returning `undefined`

```ts
if (!feature) {
  throw new Error(`[MFE] Feature "${name}" nggak terdaftar di registry`);
}
```

Throwing is deliberate: an unregistered name is a **programmer typo**, not a legitimate runtime condition. Returning `undefined` would surface the error much further downstream as an `"undefined"` URL that 404s — far harder to trace than a message naming the exact key at boot.

##### 2c. `getFeatureEntryUrl(feature: FeatureMetadata)` → `string`

| | |
|---|---|
| **Parameter** | `feature: FeatureMetadata` — the whole object from 2a |
| **Returns** | the complete `remoteEntry.js` URL |

Its body is a single template literal:

```ts
`${getBaseFederationUrl(feature.devOrigin)}${feature.entryPath}`
```

Note that of the 4 fields going in, **only 2 are used** (`devOrigin` and `entryPath`). `name` and `routes` simply pass by.

```ts
// in:  { name, entryPath: "/layout/_next/static/chunks/remoteEntry.js",
//        devOrigin: "http://localhost:3002", routes: [] }
// out: "http://localhost:3002/layout/_next/static/chunks/remoteEntry.js"
//       └──────── from devOrigin ────────┘└──────── from entryPath ────────┘
```

##### 2d. `getBaseFederationUrl(devOrigin: string)` → `string`

The layer-A function, which reads `window.location`. It has **four** branches:

| Condition | What it returns | When it happens | Example result |
|---|---|---|---|
| `!globalThis.window` | `devOrigin` | SSR / Next prerender — no `window` | `http://localhost:3002` |
| hostname is `localhost` / `127.0.0.1` | `devOrigin` | local dev, each remote on its own port | `http://localhost:3002` |
| hostname is `localhost` / `127.0.0.1` **and** `NEXT_PUBLIC_REMOTE_DARI=publish` | `window.location.origin` | local host using Vercel remotes through the rewrites | `http://localhost:3000` |
| anything else | `window.location.origin` | production, all remotes on one domain | `https://duidtin.example.com` |

The first branch exists so the function doesn't blow up while Next prerenders on the server. Its value is never actually used for a fetch — no remote is loaded server-side.

**It must be a function, not a constant.** Hard-coding the URL at build time would make the host call the dev URL even when served from production. Because it reads `window.location.hostname` **at that very moment**, one and the same bundle is correct in every environment.

In production `devOrigin` is **ignored entirely** — the only thing distinguishing one remote from another is the prefix in `entryPath` (`/design-system`, `/layout`).

##### 2e. Layer B — `bacaRemoteLokal()` → `Record<string, string>`

| | |
|---|---|
| **Parameter** | — |
| **Returns** | `{ remote_name: "http://localhost:<port>" }` from `localStorage["duidtin:remote-lokal"]`; `{}` when empty, corrupt, or storage is blocked |

Its contents are written by `terapkanParamRemoteLokal()` at the start of `federationInit()`, from `?remote-lokal=name@port`. Values other than `http://localhost:*` / `http://127.0.0.1:*` are dropped on read.

##### A full worked example — two remotes, from name to URL

```
getModuleEntry("duidtin_ui_design_system")
  → getFeatureByName  → { entryPath: "/design-system/static/remoteEntry.js",
                          devOrigin: "http://localhost:3001", … }
  → getBaseFederationUrl("http://localhost:3001")  → "http://localhost:3001"
  → result: "http://localhost:3001/design-system/static/remoteEntry.js"

getModuleEntry("duidtin_ui_layout")
  → getFeatureByName  → { entryPath: "/layout/_next/static/chunks/remoteEntry.js",
                          devOrigin: "http://localhost:3002", … }
  → getBaseFederationUrl("http://localhost:3002")  → "http://localhost:3002"
  → result: "http://localhost:3002/layout/_next/static/chunks/remoteEntry.js"

getModuleEntry("duidtin_ui_typo")
  → getFeatureByName  → undefined
  → THROW: [MFE] Feature "duidtin_ui_typo" nggak terdaftar di registry
```

Notice the two `entryPath` shapes **differ** — `/static/` for Rslib, `/_next/static/chunks/` for Next. That is why the path is stored as per-feature data rather than derived from the name by one formula.

##### Chain 2 at a glance

| Function | Parameter | Returns |
|---|---|---|
| `getFeatureByName` | `name: string` | `FeatureMetadata \| undefined` |
| `getFeatureEntryUrl` | `feature: FeatureMetadata` | `string` (complete URL) |
| `getBaseFederationUrl` | `devOrigin: string` | `string` (origin only) |
| `bacaRemoteLokal` | — | `Record<string, string>` |
| `getModuleEntry` | `name: string` | `string`, or **throws** |

#### 3. `init({ name, remotes, plugins })`

This is the data that **actually** goes in — captured from the runtime:

```json
[
  { "name": "duidtin_ui_design_system",
    "entry": "http://localhost:3001/design-system/static/remoteEntry.js" },
  { "name": "duidtin_ui_layout",
    "entry": "http://localhost:3002/layout/_next/static/chunks/remoteEntry.js" }
]
```

Note that `entryPath`, `devOrigin` and `routes` have **disappeared**. The MF runtime never learns they existed — it only receives `{ name, entry }` pairs. If that URL is wrong, no layer after this point can correct it.

`plugins` is input data too, and it is installed **here** — long before any error exists:

```ts
plugins: [
  RetryPlugin({ retryTimes: 3, retryDelay: 1000 }),   // PHASE 4, layer 1
  fallbackPlugin(),                                    // PHASE 4, layer 2
]
```

That is why PHASE 4 has no calling code at all — it has been wired up since boot.

`init()` does return a `FederationHost` instance, but we ignore it; what matters is the side effect (remotes registered in MF's global registry).

**Up to this point ZERO bytes have been fetched.** All that is stored is a name → URL mapping.

#### 4. `window.__FEDERATION_LOADED = true`

Not a function, but the most important piece of data in this phase: a single `boolean` on `window` that acts as **the green light for PHASE 2**. `waitForFederation()` in `provider.tsx` polls this flag every 200ms.

A global flag is needed because `federationInit()` is called at the top level of a module — **outside React** — so components have no handle on its promise.

#### 5. `dynamicLoadStyles(name)` → `Promise<boolean>`

Called **only for `getGlobalFeatures()`**, not `getAllFeatures()`:

```ts
await Promise.all(
  getGlobalFeatures().map((f) => dynamicLoadStyles(f.name)),
);
```

Its body is just `loadRemote(`${name}/globals`)` wrapped in `try/catch`. It returns `true` on success and `false` on failure — it **never throws**, so one dead remote cannot fail the boot.

The name is misleading: it doesn't only pull CSS. `loadRemote()` **must** fetch `remoteEntry.js` before it can retrieve any export at all, so this function also **warms the container**. That is why the same function is reused in PHASE 2 with a different intent.

#### What actually gets fetched in step 5

Captured from the browser's netlog, in order of appearance:

```
1. :3001/design-system/static/remoteEntry.js?t=1788489515965
2. :3002/layout/_next/static/chunks/remoteEntry.js?t=1788489515965
3. :3001/design-system/static/__federation_expose_globals.css
4. :3001/design-system/static/__federation_expose_globals.js
5. :3002/layout/_next/static/chunks/__federation_expose_globals.js
```

Three things only this capture reveals:

- **Always 2 fetches per remote, never 1** — `remoteEntry.js` first, then its `globals` chunk.
- **`?t=1788489515965` is a cache-buster** MF appends, and both remotes got the **exact same** number — proof they were resolved within the same tick of `federationInit()`.
- **The design system returns `globals` as TWO files (`.css` + `.js`); the layout returns only ONE (`.js`).** Not an accident: Rslib emits CSS as a separate file, while the layout uses `style-loader`, which injects CSS from inside the JS — which is exactly why `duidtin-ui-layout/next.config.mjs` needs its `style-loader/css-loader/postcss-loader` rule.

#### What's inside `remoteEntry.js` — not code, but a table of contents

This is the real content of the layout's `remoteEntry.js`, fetched on line 2 above:

```js
var moduleMap = {
  "./default": function() {
    return __webpack_require__.e("__federation_expose_default")
      .then(function() { return function() { return __webpack_require__("./layouts/default/index.tsx"); }; });
  },
  "./globals": function() {
    return __webpack_require__.e("__federation_expose_globals")
      .then(function() { return function() { return __webpack_require__("./styles/globals.css"); }; });
  }
};
```

Each key holds a **function**, not a component — your `Header`/`Footer` code **is not in here**. `__webpack_require__.e("...")` means *"when called, go fetch the chunk by this name"*. So `remoteEntry.js` is purely a map: "I have `./default` and `./globals`, and here is where each lives".

If the host asks for a key that isn't in this map, `remoteEntry.js` itself throws:

```js
throw new Error('Module "' + module + '" does not exist in container.');
```

That failure is caught **neither by TypeScript nor at build time** — the two repos build separately and nothing cross-checks them.

#### Summary — what each function returns

| Function | Returns | Example value |
|---|---|---|
| `getAllFeatures()` | `FeatureMetadata[]` | 2 registry objects (global + per-feature) |
| `getFeatureByName(name)` | `FeatureMetadata \| undefined` | the `duidtin_ui_layout` registry object |
| `getBaseFederationUrl(devOrigin)` | `string` | `"http://localhost:3002"` |
| `getFeatureEntryUrl(f)` | `string` | `"http://localhost:3002/layout/_next/.../remoteEntry.js"` |
| `getModuleEntry(name)` | `string` (or **throws**) | same as above |
| `init({...})` | `FederationHost` (ignored) | side effect: remotes registered |
| `dynamicLoadStyles(name)` | `Promise<boolean>` | `true` |
| `loadRemote(id)` | `Promise<unknown>` | the raw module; its shape differs per remote |

**Why there is no top-level `await`.** The `qcash-ui` host uses a top-level `await` in `_app.tsx`. It isn't needed here: `init()` is called **before the first `await`** inside `federationInit()`, so every remote is registered the moment `void federationInit()` returns — synchronously. The only thing awaited inside is the CSS warm-up, and that must not delay module evaluation. The consequence is that the CSS request leaves earlier (at boot) than any remote component chunk (only on mount), so in practice the CSS always lands first.

### PHASE 2 — Per-route preload (`components/federation/provider.tsx`)

```
_app.tsx
  └─▶ <ModuleFederationProvider>                          → JSX.Element
        ├─▶ useRouter()                                    → NextRouter
        ├─▶ useModuleLoading()                             → { loadModulesByRoute, moduleStatus }
        │     ├─ useState<Record<string, ModuleStatus>>     → moduleStatus  (state)
        │     └─ useRef<Set<string>>                        → requestedRef  (dedup)
        ├─▶ useState<string | null>                        → loadedForPath (guard)
        └─▶ useEffect  (whenever router.pathname changes)
              ├─▶ waitForFederation(maxWaitMs?, intervalMs?)  → Promise<boolean>
              └─▶ loadModulesByRoute(route)                    → void
                    ├─▶ getModulesForRoute(route)              → string[]
                    │     └─▶ isRouteMatch(pattern, route, matchType) → boolean
                    └─▶ loadModule(name)                       → Promise<void> (fire-and-forget)
                          └─▶ dynamicLoadStyles(name)          → Promise<boolean>
                                └─▶ loadRemote(name + "/globals") → Promise<unknown>
```

The fundamental difference from PHASE 1: this phase **returns nothing to its caller**. Everything it produces is a side effect — a container cached in the browser, and one status object in React state.

#### 1. `ModuleFederationProvider({ children })` → `JSX.Element`

| | |
|---|---|
| **Parameter** | `{ children?: ReactNode }` — its only prop |
| **Returns** | `<RemoteErrorBoundary>{children}</RemoteErrorBoundary>` |

```tsx
// in:
<ModuleFederationProvider>
  <HomePage />
</ModuleFederationProvider>

// out:
<RemoteErrorBoundary>
  <HomePage />          // ← passed straight through, untouched
</RemoteErrorBoundary>
```

Something surprising here: **what this component renders has nothing to do with federation at all.**

```tsx
return <RemoteErrorBoundary>{children}</RemoteErrorBoundary>;
```

So the component has two entirely separate roles:

| | Belongs to |
|---|---|
| Its **return value** (the error boundary) | PHASE 4 |
| Its **side effect** (`useEffect` → warm-up) | PHASE 2 |

It renders **no remote component whatsoever**. `children` passes straight through. What puts remotes on screen is the page file in `pages/` (PHASE 3).

#### 2. `useModuleLoading()` → `{ loadModulesByRoute, moduleStatus }`

| | |
|---|---|
| **Parameters** | none |
| **Returns** | an object with 1 function + 1 piece of state |

```ts
{
  loadModulesByRoute: (route: string) => void,
  moduleStatus:       Record<string, "loading" | "loaded" | "error">,
}
```

```ts
// in:  — (none)
// out (on first render):
{
  loadModulesByRoute: ƒ (route: string) => void,
  moduleStatus:       {},        // still empty, nothing loaded yet
}
```

##### Reading the line `const { loadModulesByRoute } = useModuleLoading();`

This line trips people up because two things happen at once: **calling the hook**, then **unpacking the object it returns**. Split into two steps:

```ts
// STEP 1 — call the hook, keep the whole result
const result = useModuleLoading();

// `result` now holds:
// {
//   loadModulesByRoute: ƒ (route) => void,
//   moduleStatus:       {},
// }

// STEP 2 — pull one property out into its own variable
const loadModulesByRoute = result.loadModulesByRoute;
```

Those two steps collapse into one line via **object destructuring**:

```ts
const { loadModulesByRoute } = useModuleLoading();
//      ^^^^^^^^^^^^^^^^^^
//      the name inside the braces MUST match the property name on the object
```

To take both at once, just add a comma:

```ts
const { loadModulesByRoute, moduleStatus } = useModuleLoading();
```

**`moduleStatus` is returned but never destructured.** Right now it is genuinely dead data — no UI reads it. It is deliberately prepared so a loading indicator or manual retry can be added later without touching the loading path.

##### The two data containers inside the hook

| Container | Type | Why that kind |
|---|---|---|
| `moduleStatus` | `useState<Record<string, ModuleStatus>>` | must trigger a re-render if it is ever displayed |
| `requestedRef` | `useRef<Set<string>>` | must **not** trigger a re-render, and must be readable instantly |

`requestedRef` has to be a ref, not state. Its value must be visible **immediately** on the next call — with state, two rapid navigations could both slip through before the state flushed, and the remote would be fetched twice.

#### 3. The `useEffect` — the trigger

| | |
|---|---|
| **Dependencies** | `[loadModulesByRoute, loadedForPath, router.pathname]` |
| **Triggering data** | `router.pathname` — a `string`, e.g. `"/transaksi"` |
| **Returns** | a cleanup function (`() => { isStale = true; }`) |

Two guards keep it from doing duplicate work:

```ts
// 1. Same route as the one just processed → stop before starting
if (loadedForPath === router.pathname) return;

// 2. Navigated away while waiting → this poll result is stale
let isStale = false;
...
if (isStale) return;
return () => { isStale = true; };
```

The second guard matters because `waitForFederation()` can take up to 5 seconds. Without it, a user navigating quickly could trigger a warm-up for a route they already left.

> `router.pathname`, not `router.asPath` — it uses Next's route pattern (`/transaksi/[id]`), not the concrete URL (`/transaksi/42`).

#### 4. `waitForFederation(maxWaitMs?, intervalMs?)` → `Promise<boolean>`

| | |
|---|---|
| **Parameters** | `maxWaitMs = 5000`, `intervalMs = 200` — both defaulted |
| **Returns** | `true` if federation is ready, `false` if it gave up |

All it polls is the single boolean PHASE 1 set:

```ts
while (!globalThis.window?.__FEDERATION_LOADED) {
  if (Date.now() - startedAt > maxWaitMs) return false;
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
return true;
```

| Condition | Result | What happens next |
|---|---|---|
| Flag already `true` when called | `true` **immediately**, not a single `setTimeout` | proceed to warm-up |
| Flag flips mid-poll | `true` within ≤ 5 seconds | proceed to warm-up |
| 5 seconds elapse | `false` | `console.error`, warm-up **skipped** — the page still works |

```ts
// in:  () — using the defaults, so (5000, 200)
// out: true         ← flag already set; finishes in one tick, no setTimeout at all

// in:  (1000, 100) — budget narrowed to 1 second
// out: false        ← if the flag doesn't flip within 1 second
```

In practice the first branch is almost always taken: PHASE 1 sets that flag **synchronously**, before its first `await`. So this poll typically finishes in a single tick with no delay at all.

**Why polling rather than a plain `await`.** `federationInit()` is called at the top level of the `_app.tsx` module — **outside React**. Components have no handle on its promise, so a global flag on `window` is the only channel available.

`false` does **not** stop the page. The warm-up is an optimisation; skip it and PHASE 3 still loads the remote itself, just without the cache benefit.

#### 5. `loadModulesByRoute(route)` → `void`

| | |
|---|---|
| **Parameter** | `route: string` |
| **Returns** | `void` — nothing, and nothing that can be awaited |

```ts
for (const moduleName of getModulesForRoute(route)) {
  void loadModule(moduleName);      // ← void, deliberately not awaited
}
```

```ts
// in:  "/transaksi"
// out: undefined              ← void, nothing to await
// side effect: calls loadModule("duidtin_ui_transaksi")

// in:  "/"
// out: undefined
// side effect: NONE           ← getModulesForRoute("/") returned []
```

Wrapped in `useCallback(..., [loadModule])` so its identity stays stable — otherwise the `useEffect` that depends on it would re-run on every render.

Note the `void` in front of `loadModule`: every module starts **at the same time**, none waits for another. If three remotes match one route, all three set off in parallel.

#### 6. `getModulesForRoute(route)` → `string[]`

| | |
|---|---|
| **Parameter** | `route: string` — e.g. `"/transaksi/detail/123"` |
| **Returns** | **names only**, not objects |

```ts
Object.values(featureRegistry)          // ← WITHOUT globalFeatures
  .filter((f) => f.routes.some((pattern) =>
    isRouteMatch(pattern, route, f.matchType ?? "prefix")))
  .map((f) => f.name);
```

```ts
// in:  "/transaksi/detail/123"
// out: ["duidtin_ui_transaksi"]        ← names only, the objects are dropped

// in:  "/"
// out: ["duidtin_feature_beranda"]     ← beranda is registered on route "/"

// in:  "/does-not-exist"
// out: []
```

This is where the data **shrinks sharply**: full `FeatureMetadata` objects go in, a bare `string[]` comes out. The rest of the metadata isn't carried along, because `loadRemote()` only needs the name — the URL was registered back in PHASE 1.

**`globalFeatures` is deliberately excluded.** Those were loaded unconditionally in PHASE 1; route-matching them again would only load the same thing twice.

##### 6a. `isRouteMatch(pattern, route, matchType)` → `boolean`

| Parameter | Type | Example |
|---|---|---|
| `pattern` | `string` | `"/transaksi"` — from `feature.routes[]` |
| `route` | `string` | `"/transaksi/detail/123"` — from `router.pathname` |
| `matchType` | `"prefix" \| "exact"` | defaults to `"prefix"` |

```ts
matchType === "exact"
  ? route === pattern
  : route === pattern || route.startsWith(`${pattern}/`);
```

```ts
// in:  ("/transaksi", "/transaksi/detail/123", "prefix")
// out: true

// in:  ("/transaksi", "/transaksian", "prefix")
// out: false        ← because the pattern is compared as "/transaksi/"

// in:  ("/profil", "/profil/edit", "exact")
// out: false
```

The `prefix` branch is **not** a bare `startsWith` — note the trailing `/`. Without it, `/transaksian` would wrongly match `/transaksi`.

Real results, recorded with a registry holding 3 sample features:

```
/transaksi             → [duidtin_ui_transaksi]   # exact hit
/transaksi/detail/123  → [duidtin_ui_transaksi]   # prefix, sub-path included
/rekap                 → [duidtin_ui_laporan]     # the SECOND route of the same remote
/profil                → [duidtin_ui_profil]      # exact, matches
/profil/edit           → []                       # exact, sub-path does NOT match
/transaksian           → []                       # prefix is not a bare startsWith
/                      → []                       # nothing matches
```

#### 7. `loadModule(name)` → `Promise<void>`

| | |
|---|---|
| **Parameter** | `moduleName: string` |
| **Returns** | `Promise<void>` — but called as `void loadModule(...)`, never awaited |

```ts
// in:  "duidtin_ui_transaksi"
// out: Promise<void>  → undefined

// its side effects:
//   requestedRef   Set {}  →  Set { "duidtin_ui_transaksi" }
//   moduleStatus   {}  →  { "duidtin_ui_transaksi": "loading" }
//                      →  { "duidtin_ui_transaksi": "loaded" }
//   console        [MFE] FASE 2 warm-up "duidtin_ui_transaksi" → ok

// in:  "duidtin_ui_transaksi"  (called a SECOND time)
// out: undefined
// side effect: NONE            ← already in requestedRef, bails immediately
```

It has two side effects: dedup and status.

**Dedup:**

```ts
if (requestedRef.current.has(moduleName)) return;   // already requested → bail
requestedRef.current.add(moduleName);
```

On failure the name is **removed again** from the Set:

```ts
if (!isLoaded) requestedRef.current.delete(moduleName);
```

so the next navigation to the same route may retry — the remote's dev server might have just come up.

**Status transitions:**

```ts
{}                                        // before navigation
{ "duidtin_ui_transaksi": "loading" }     // the moment loadModule starts
{ "duidtin_ui_transaksi": "loaded" }      // after dynamicLoadStyles finishes
```

There is also a dev-only log here, because this phase has **no visual trace whatsoever** — without it, the only way to confirm it ran is to watch the Network tab:

```ts
if (process.env.NODE_ENV === "development") {
  console.info(`[MFE] FASE 2 warm-up "${moduleName}" → ${isLoaded ? "ok" : "GAGAL"}`);
}
```

#### 8. `dynamicLoadStyles(name)` → `Promise<boolean>`

```ts
// in:  "duidtin_ui_layout"
// what it calls internally: loadRemote("duidtin_ui_layout/globals")

// the network traffic that follows (if the container isn't cached yet):
//   GET :3002/layout/_next/static/chunks/remoteEntry.js?t=1788489515965
//   GET :3002/layout/_next/static/chunks/__federation_expose_globals.js

// out: true

// if the remote is down:
// out: false        ← does NOT throw; the error is only console.error'd
```

**The very same function as in PHASE 1**, reused with a different intent:

| | PHASE 1 | PHASE 2 |
|---|---|---|
| Called for | `getGlobalFeatures()` | the result of `getModulesForRoute()` |
| Main purpose | prevent FOUC | warm the container |
| Is the result used? | no | yes — it becomes `moduleStatus` |

What gets fetched is identical too: `remoteEntry.js` first, then its `globals` chunk. What is **not** fetched in this phase is the page component's JS chunk — that only happens in PHASE 3.

#### A full worked example — one navigation, values at every step

Connecting all four functions in a single flow. This example uses a **hypothetical** feature remote `duidtin_ui_transaksi` on port 3003 — it doesn't exist in the repo yet, but this is the shape it will take.

```
User clicks a link to /transaksi
│
│  router.pathname changes: "/" → "/transaksi"
▼
useEffect runs
│
├─ guard: loadedForPath ("/") !== "/transaksi"  → continue
│
├─▶ waitForFederation()
│      parameter : ()  — using defaults (5000, 200)
│      returns   : true                      ← flag has been set since PHASE 1
│
└─▶ loadModulesByRoute("/transaksi")
      parameter : "/transaksi"
      returns   : undefined                  ← void
      │
      ├─▶ getModulesForRoute("/transaksi")
      │      parameter : "/transaksi"
      │      returns   : ["duidtin_ui_transaksi"]
      │      │
      │      └─ inside, for each featureRegistry entry:
      │            isRouteMatch("/transaksi", "/transaksi", "prefix")
      │              parameters : (pattern, route, matchType)
      │              returns    : true
      │
      └─ for (const name of ["duidtin_ui_transaksi"]) …
           │
           └─▶ loadModule("duidtin_ui_transaksi")     ← void, never awaited
                 parameter : "duidtin_ui_transaksi"
                 returns   : Promise<void>
                 │
                 ├─ requestedRef : Set {} → Set { "duidtin_ui_transaksi" }
                 ├─ moduleStatus : {} → { "duidtin_ui_transaksi": "loading" }
                 │
                 └─▶ dynamicLoadStyles("duidtin_ui_transaksi")
                       parameter : "duidtin_ui_transaksi"
                       returns   : Promise<boolean> → true
                       │
                       └─▶ loadRemote("duidtin_ui_transaksi/globals")
                             parameter : "duidtin_ui_transaksi/globals"
                             returns   : Promise<unknown> → the CSS module
                             │
                             └─ NETWORK (always 2 requests):
                                GET :3003/transaksi/_next/static/chunks/remoteEntry.js
                                GET :3003/transaksi/_next/static/chunks/__federation_expose_globals.js
                 │
                 ├─ moduleStatus : → { "duidtin_ui_transaksi": "loaded" }
                 └─ console      : [MFE] FASE 2 warm-up "duidtin_ui_transaksi" → ok
      │
      ▼
   setLoadedForPath("/transaksi")   ← so the next render doesn't repeat the work
```

Notice how the data changes shape at each level down:

| Level | Value | Type |
|---|---|---|
| trigger | `"/transaksi"` | `string` |
| `getModulesForRoute` | `["duidtin_ui_transaksi"]` | `string[]` |
| `loadModule` | `"duidtin_ui_transaksi"` | `string` |
| `dynamicLoadStyles` | `"duidtin_ui_transaksi"` | `string` |
| `loadRemote` | `"duidtin_ui_transaksi/globals"` | `string` ← `"/globals"` is appended here |
| network | 2 URLs | HTTP requests |

One route (`string`) becomes a list of names (`string[]`), then each name is processed individually until it becomes HTTP requests. The `"/globals"` suffix is only appended at the very last step, inside `dynamicLoadStyles`.

#### Proof this phase really runs — and really is optional

Tested by temporarily registering `duidtin_ui_layout` in `featureRegistry` with `routes: ["/uji"]`:

| Route opened | PHASE 2 logs | Layout rendered? |
|---|---|---|
| `/` | **0** — route doesn't match | **yes**, fully |
| `/uji` | **1** — `warm-up "duidtin_ui_layout" → ok` | yes |

That first row is the whole point: on `/` this phase **did not run at all**, yet the layout still appeared intact because PHASE 3 loads it on its own.

**Practical consequence:** if a remote is ever forgotten in `featureRegistry`, the symptom is **not a broken page** — the page stays correct, just slightly slower. This bug will not announce itself; look for it in the `[MFE]` logs or the Network tab.

#### Summary — what each function returns

| Function | Parameters | Returns |
|---|---|---|
| `ModuleFederationProvider` | `{ children?: ReactNode }` | `JSX.Element` (the error boundary) |
| `useModuleLoading` | — | `{ loadModulesByRoute, moduleStatus }` |
| `waitForFederation` | `maxWaitMs = 5000`, `intervalMs = 200` | `Promise<boolean>` |
| `loadModulesByRoute` | `route: string` | `void` |
| `getModulesForRoute` | `route: string` | `string[]` (names only) |
| `isRouteMatch` | `pattern`, `route`, `matchType` | `boolean` |
| `loadModule` | `moduleName: string` | `Promise<void>` (fire-and-forget) |
| `dynamicLoadStyles` | `moduleName: string` | `Promise<boolean>` |

> This phase **now genuinely runs**, ever since `duidtin_feature_beranda` was registered on route `/`. Open `localhost:3000` with the console open, filter for `[MFE]`, and the log `FASE 2 warm-up "duidtin_feature_beranda" → ok` appears. Before the first feature remote existed, `getModulesForRoute()` always returned `[]` and this whole phase was a no-op.

### PHASE 3 — The actual render (`pages/index.tsx`, `pages/login.tsx`)

```
Browser opens "/"
  └─▶ Next routing → pages/index.tsx
        └─▶ _app.tsx
              └─▶ Component.getLayout(<HomePage />)          → ReactNode
                    └─▶ <DefaultLayout>                       ← a component made by remoteComponent()
                          │
                          ├─ (on MOUNT) the loader runs:
                          │     loadRemote("duidtin_ui_layout/default")  → Promise<unknown>
                          │       → { default: ƒ }
                          │     normalised into { default: ComponentType }
                          │
                          └─▶ <HomePage /> → <RemoteMount modul="duidtin_feature_beranda/base" />
                                ├─ (on MOUNT) the loader runs inside useEffect:
                                │     loadRemote("duidtin_feature_beranda/base")
                                │       → { mount: ƒ }        ← a FUNCTION, not a component
                                └─ mount(<div>) → a Vue app is mounted; its contents belong to the remote
```

This is the phase that **actually puts components on screen**, and it is **entirely independent of `registry.ts`** — the strings are written by hand, one page file at a time.

There are two pages, and their shapes differ on purpose:

| Page | Remote | Layout | Note |
|---|---|---|---|
| `pages/index.tsx` | `duidtin_feature_beranda/base` | `getLayout` → `DefaultLayout` (the layout remote), with `userName`/`onLogout` from `useAuth()` | this remote is **Vue**, so it renders through `<RemoteMount>`, not `remoteComponent()` |
| `pages/login.tsx` | `duidtin_feature_auth/login` | **no `getLayout`** | the header needs a session, and here the user has none yet. Redirecting after success is the host's job, through the `onSuccess` prop |

#### 1. `remoteComponent(path, pick?)` → `ComponentType`

A component factory. Every bridge to a remote is built through this function.

| | |
|---|---|
| **Parameter 1** | `path: string` — `"duidtin_ui_layout/default"` |
| **Parameter 2** | `pick?: (mod) => ComponentType` — optional, see section 3 |
| **Returns** | a React component (from `next/dynamic`), **not** a promise |

```ts
// in:  "duidtin_ui_layout/default"
// out: a React component ready to use as <DefaultLayout />
export const DefaultLayout = remoteComponent<DefaultLayoutProps>("duidtin_ui_layout/default");
```

##### When `loadRemote` actually runs — the part people get wrong

The line `export const DefaultLayout = remoteComponent(...)` runs **when the module is imported**, right after the bundle loads. But **`loadRemote` inside it does NOT run then.**

```
at module import       remoteComponent() is called
                       → dynamic() is called
                       → a Loadable component comes back
                       → loadRemote has NOT run, zero fetches

at component MOUNT     next/dynamic runs the loader
  (<DefaultLayout /> renders)  → loadRemote("duidtin_ui_layout/default")
                               → fetches the component chunk
                               → the real component replaces the placeholder
```

So defining 20 remote bridges in one file does not trigger 20 fetches. Only what renders gets fetched.

#### 1b. `<RemoteMount modul>` — for remotes that are not React

`remoteComponent()` assumes the module exports a component. That does not hold for
`duidtin_feature_beranda`, which is Vue: React cannot render a Vue component, nor the
other way round. The only thing that crosses the boundary is **DOM**, so that remote
exposes a function instead.

```tsx
// components/federation/remote-mount.tsx
const mod = await loadRemote<{ mount?: Pemasang }>(modul);
lepas = mod.mount(wadah.current);   // inside useEffect
…
return () => lepas?.();             // on cleanup
```

| | |
|---|---|
| **Prop** | `modul: string` — `"duidtin_feature_beranda/base"` |
| **Expects** | `mount(el: HTMLElement) => () => void` |
| **Renders** | one empty `<div>`; everything inside it belongs to the remote |

The host never learns which framework fills that `<div>`. A Svelte or Angular remote
later uses this same component with not a line changed here. Two details that matter:
the effect can be torn down before the module arrives (in dev, StrictMode runs every
effect twice), so the result is discarded when that happens; and a failure to load is
rendered inline rather than thrown, because one dead feature should not take the page
with it.

#### 2. `loadRemote(path)` → `Promise<unknown>`

| | |
|---|---|
| **Parameter** | `path: string` — `"<container name>/<exposes key without './'>"` |
| **Returns** | the raw module — **its shape differs per remote** |

Here are the real shapes, captured at runtime:

```ts
// in:  "duidtin_ui_layout/default"
// out: keys ["default"]                 typeof default = "function"

// in:  "duidtin_ui_design_system/components/button"
// out: keys ["Button", "default"]       typeof default = "function"

// in:  "duidtin_ui_design_system/components/card"
// out: keys ["Card", "default"]         typeof default = "function"
```

The design system exports **both named AND default** for every component:

```ts
// duidtin-ui-design-system/apps/producer/src/components/button.ts
export { Button } from "@duidtin/ui";
export { Button as default } from "@duidtin/ui";
```

while the layout only has a `default`. These differing shapes are exactly what has to be normalised before handing anything to `next/dynamic`.

#### 3. `pick(mod)` → `ComponentType` — why it exists

`next/dynamic` requires a module shaped `{ default: Component }`. Without `pick`, the bridge takes `mod.default`. But there is a case `default` cannot serve.

`Card` is a **compound component** — it carries sub-components as properties:

```ts
export const Card = Object.assign(Root, { Root, Header, Body, Footer });
```

The problem: **`next/dynamic` wraps the module in a Loadable component, and static properties do not survive.** So `Card.Header` is lost if you go through `default`. The fix is to load the same expose with a different `pick`:

```ts
// without pick → take mod.default
export const Card = remoteComponent<CardProps>(`${DESIGN_SYSTEM}/components/card`);

// with pick → take a different member of the SAME module
export const CardHeader = remoteComponent<CardSectionProps>(
  `${DESIGN_SYSTEM}/components/card`,
  (mod) => (mod as unknown as CardModule).Card.Header,
);
```

```ts
// pick in:  { Card: ƒ (has .Header, .Body, .Footer), default: ƒ }
// pick out: ƒ Header
```

The consequence shows up at runtime: `loadRemote(".../components/card")` fires **3×** on one page (`Card`, `CardHeader`, `CardBody`). Not 3 fetches though — MF caches the container and the chunk, so the last two are served from memory.

#### 4. `dynamic(loader, { ssr: false })` → a Loadable component

| | |
|---|---|
| **Parameter 1** | a loader function returning `Promise<{ default: ComponentType }>` |
| **Parameter 2** | `{ ssr: false }` |
| **Returns** | a React component usable directly in JSX |

**`ssr: false` is mandatory, not a preference.** The module is fetched at runtime from another origin; while Next prerenders on the server, that remote does not exist yet. Without `ssr: false` the build fails or hydration mismatches.

#### 5. `HomePage.getLayout(page)` → `ReactNode`

A property attached to the page component — not a React prop, just an ordinary JavaScript function property.

| | |
|---|---|
| **Parameter** | `page: ReactElement` — the page element itself |
| **Returns** | the page wrapped in its layout |

```tsx
// in:
<HomePage />

// out:
<DefaultLayout activePath="/" userName="Angga" onLogout={...}>
  <HomePage />
</DefaultLayout>
```

And `_app.tsx` is what calls it:

```tsx
const getLayout = Component.getLayout ?? ((page: ReactElement) => page);
//                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                        fallback: return it unchanged
return <ModuleFederationProvider>{getLayout(<Component {...pageProps} />)}</ModuleFederationProvider>;
```

**Why this pattern is needed in an MFE host.** The layout is itself a remote. Wrapping it directly in `_app.tsx` would make pages that need no layout (login, error) wait for the layout remote anyway. With `getLayout`, each page decides for itself — a page without `getLayout` falls back to the identity function and loads no layout at all.

#### A full worked example — opening `/`, from URL to DOM

```
Browser opens http://localhost:3000/
│
├─ Next matches the URL → pages/index.tsx
│
├─▶ _app.tsx
│     Component            = HomePage
│     Component.getLayout  exists → used
│     result: <ModuleFederationProvider>
│               <DefaultLayout …><HomePage /></DefaultLayout>
│             </ModuleFederationProvider>
│
├─▶ <DefaultLayout> MOUNTS         ← INFRASTRUCTURE remote, from components/remote/
│     └─▶ loadRemote("duidtin_ui_layout/default")
│           out      : { default: ƒ }
│           NETWORK  : GET :3002/layout/_next/.../__federation_expose_default.js
│
└─▶ <HomePage /> → <RemoteMount> MOUNTS          ← FEATURE remote, declared
      │                                             directly in pages/index.tsx
      └─▶ loadRemote("duidtin_feature_beranda/base")
            out      : { mount: ƒ, default: ƒ }    ← a FUNCTION, not a component
            NETWORK  : GET :3003/beranda/static/js/async/[base chunk]
            │
            └─ mount(<div>) → a Vue app is mounted into that element
                 loadRemote("duidtin_ui_design_system/component-wrapper/semua")
                 NETWORK : GET :3001/design-system/static/__federation_expose_component_wrapper__*.js
                 → customElements.define("dtn-card", …) and so on
                 → <dtn-card> in a Vue template runs the very same React component
```

Note the split on the `MOUNTS` lines: the layout comes through `components/remote/`
(an infrastructure remote, used across pages), while beranda is declared directly
in `pages/index.tsx` (a feature remote, used by one page only).

And note the shape of what comes back: beranda returns a **function**, not a component.
That is not a stylistic choice — the remote is Vue, and React cannot render a Vue
component. `components/federation/remote-mount.tsx` supplies an empty `<div>`, calls
the function, and calls the returned cleanup when the effect tears down.

The resulting DOM — **four repos** interleaved in one tree:

```html
<div class="lyt-layout">                            <!-- duidtin_ui_layout -->
  <header class="lyt-header">
    <span class="ui-badge ui-badge--soft" …>        <!-- design system VIA the layout -->
    <button class="ui-button …" id="react-aria2066869333-:r4:">Keluar</button>
  </header>
  <main class="lyt-layout__main">
    <div class="fber-page">                         <!-- duidtin_feature_beranda (VUE), prefix fber -->
      <dtn-card variant="elevated">                 <!-- a design-system Web Component -->
        <span data-dtn-wadah>                       <!-- the React root INSIDE the element -->
          <div class="ui-card ui-card--elevated" …>
      <dtn-button color="default" variant="outline">
        <button class="ui-button …" id="react-aria2066869333-:r6:">Perbarui</button>
    </div>
  </main>
</div>
```

The host itself contributes **not a single element** here — it only composes.

And look at those two React Aria `id`s: the header one is rendered by the **host's** React,
the beranda one by a React root inside a **Web Component**, inside a **Vue** app, loaded
through **beranda's own** MF runtime — yet the prefix is identical
(`react-aria2066869333`). Had React been duplicated, the prefixes would differ. That is
mechanical proof the React shared scope reaches all the way into a remote that is not
even React.

The `<span data-dtn-wadah>` above is not decoration either: it is the container the
design-system wrapper creates for its React root, so that `createRoot().render()` does
not overwrite the original children Vue passed in. Details in the design-system README.

#### What this phase fetches, and what it does NOT

| | Fetched in | Example |
|---|---|---|
| `remoteEntry.js` (the container) | PHASE 1 / PHASE 2 | `remoteEntry.js?t=…` |
| The `globals` chunk (CSS) | PHASE 1 / PHASE 2 | `__federation_expose_globals.js` |
| **The component chunk** | **PHASE 3** | `__federation_expose_default.js` |

Because the container was warmed in an earlier phase, PHASE 3 only has to fetch the component chunk. That is precisely the payoff of PHASE 2's warm-up.

#### Summary — what each function returns

| Function | Parameters | Returns |
|---|---|---|
| `remoteComponent` | `path: string`, `pick?` | `ComponentType` (a component, not a promise) |
| `loadRemote` | `path: string` | `Promise<unknown>` — shape differs per remote |
| `pick` | `mod: Record<string, unknown>` | `ComponentType` |
| `dynamic` | `loader`, `{ ssr: false }` | a Loadable component |
| `HomePage.getLayout` | `page: ReactElement` | `ReactNode` (the page wrapped in its layout) |

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
