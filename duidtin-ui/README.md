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

- Boot registers every remote (2 global + 1 feature); the global CSS is fetched before the first render.
- `loadRemote("duidtin_ui_layout/default")` wraps the page — header and footer render with their styles intact.
- **PHASE 2 now genuinely runs**, ever since `duidtin_feature_beranda` was registered on route `/`. Before that, `featureRegistry` was empty and the loop did zero iterations.
- **React stays a single instance across 4 repos AND across MF versions.** Concrete evidence: the button loaded through the layout (MF 0.24.1) and the button loaded through beranda (MF **2.x**) share the same React Aria ID prefix (`react-aria4676304478-:r2:` vs `:r6:`) — had React been duplicated, the prefixes would differ.
- `fallbackPlugin` is proven to fire: while the layout was still failing to load, the page did not go blank; only that part was swapped for an error box.
- The host renders **no UI component of its own at all** — the shell is genuinely thin. Everything on `/` comes from a remote.

Not there yet:

- **A second feature remote and beyond** — there is only one so far (`duidtin_feature_beranda` at route `/`). Payroll, Transfer, Statement and Approvals are still missing.
- i18n (no equivalent of `qcash-ui`'s `loadLocalesForModule` yet).
- Auth/context provider — `userName` and `onLogout` are still hardcoded in `pages/index.tsx`, and the layout's menu does not yet adapt to roles (maker vs checker).
- Per-module local port overrides (`getModuleEntry` layer B in `qcash-ui`) — not worth it while there are still few remotes.

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
    remote/index.tsx     # bridge for INFRASTRUCTURE remotes only (the layout).
                         # FEATURE remotes are declared in their own pages/ file
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

What it returns today — 2 global + 1 feature:

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
  { name: "duidtin_feature_beranda",
    entryPath: "/beranda/_next/static/chunks/remoteEntry.js",
    devOrigin: "http://localhost:3003",
    routes: ["/"] },              // ← this one is per-feature, not global
]
```

> **`routes: []` does not mean "not registered".** This function deliberately takes **both global AND per-feature**. Once `featureRegistry` holds 3 features this returns 5 items, and all five get registered. The only thing separating global from per-feature is step 5 below.

#### 2. `getModuleEntry(name)` → `string`

This is not one function but a **chain of three**. Called once per remote:

```
getModuleEntry("duidtin_ui_layout")                     → string
  ├─▶ getFeatureByName("duidtin_ui_layout")             → FeatureMetadata | undefined
  │     └─▶ getAllFeatures().find(f => f.name === name)
  ├─▶ (guard) if undefined → THROW
  └─▶ getFeatureEntryUrl(feature)                        → string
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

The only function here that touches `window`. It has **three** branches, not two:

| Condition | What it returns | When it happens | Example result |
|---|---|---|---|
| `!globalThis.window` | `devOrigin` | SSR / Next prerender — no `window` | `http://localhost:3002` |
| hostname is `localhost` / `127.0.0.1` | `devOrigin` | local dev, each remote on its own port | `http://localhost:3002` |
| anything else | `window.location.origin` | production, all remotes on one domain | `https://duidtin.example.com` |

The first branch exists so the function doesn't blow up while Next prerenders on the server. Its value is never actually used for a fetch — no remote is loaded server-side.

**It must be a function, not a constant.** Hard-coding the URL at build time would make the host call the dev URL even when served from production. Because it reads `window.location.hostname` **at that very moment**, one and the same bundle is correct in every environment.

In production `devOrigin` is **ignored entirely** — the only thing distinguishing one remote from another is the prefix in `entryPath` (`/design-system`, `/layout`).

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

### PHASE 3 — The actual render (`pages/index.tsx`)

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
                          └─▶ <HomePage />  containing <Card> and <Button>
                                └─ each remote component mounts → its own loader runs
```

This is the phase that **actually puts components on screen**, and it is **entirely independent of `registry.ts`** — the strings are written by hand, one page file at a time.

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
└─▶ <HomePage /> → <BerandaContainer /> MOUNTS   ← FEATURE remote, declared
      │                                             directly in pages/index.tsx
      └─▶ loadRemote("duidtin_feature_beranda/base")
            out      : { default: ƒ }
            NETWORK  : GET :3003/beranda/_next/.../[base chunk]
            │
            └─ INSIDE beranda, a remote calls another remote again:
                 loadRemote("duidtin_ui_design_system/components/card")   → { Card, default }
                 loadRemote("duidtin_ui_design_system/components/button") → { Button, default }
                 loadRemote("duidtin_ui_design_system/components/alert")  → { Alert, default }
                 loadRemote("duidtin_ui_design_system/components/badge")  → { Badge, default }
                 NETWORK : GET :3001/design-system/static/__federation_expose_components__*.js
```

Note the split on the `MOUNTS` lines: the layout comes through `components/remote/`
(an infrastructure remote, used across pages), while beranda is declared directly
in `pages/index.tsx` (a feature remote, used by one page only).

The resulting DOM — **four repos** interleaved in one tree:

```html
<div class="lyt-layout">                            <!-- duidtin_ui_layout -->
  <header class="lyt-header">
    <span class="ui-badge ui-badge--soft" …>        <!-- design system VIA the layout -->
    <button class="ui-button …" id="react-aria4676304478-:r2:">Keluar</button>
  </header>
  <main class="lyt-layout__main">
    <div class="fber-page">                         <!-- duidtin_feature_beranda, Tailwind prefix fber -->
      <div class="ui-card ui-card--elevated" …>     <!-- design system VIA beranda -->
      <button class="ui-button …" id="react-aria4676304478-:r6:">Payroll</button>
    </div>
  </main>
</div>
```

The host itself contributes **not a single element** here — it only composes.

And look at those two React Aria `id`s: `:r2:` was loaded through the layout (MF 0.24.1),
`:r6:` through beranda (MF **2.x**), yet the prefix is identical (`react-aria4676304478`).
Had React been duplicated, the prefixes would differ. That is mechanical proof the React
shared scope carries **across Module Federation versions**, not merely across repos.

#### What this phase fetches, and what it does NOT

| | Fetched in | Example |
|---|---|---|
| `remoteEntry.js` (the container) | PHASE 1 / PHASE 2 | `remoteEntry.js?t=…` |
| The `globals` chunk (CSS) | PHASE 1 / PHASE 2 | `__federation_expose_globals.js` |
| **The component chunk** | **PHASE 3** | `__federation_expose_default.js` |

Because the container was warmed in an earlier phase, PHASE 3 only has to fetch the component chunk. That is precisely the payoff of PHASE 2's warm-up.

#### Rules that nothing enforces

- **File path = URL path = `exposes` key.** All three are kept in sync by hand. `pages/transaksi/index.tsx` ↔ URL `/transaksi` ↔ `exposes["./base"]` in its remote.
- **Nothing is generated** from `registry.ts`. Adding one sub-page means editing **2 repos**.
- **A typo only surfaces in the browser** — `Module "..." does not exist in container.` Neither TypeScript nor the build cross-checks across repos.

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

## Next steps

1. **The next feature remotes** — Beneficiaries, Payroll, Statement, Approvals. Three things every new remote must get right from day one:
   - **an absolute `assetPrefix` in dev**, otherwise its chunks are requested from the host's origin and 404 (lesson from `duidtin-ui-layout`);
   - **`shared` react as a singleton** — `nextjs-mf` handles it automatically, `enhanced` does **not**;
   - **register remotes on a code path that runs when the host loads it** — not in `pages/_app.tsx`, which is never executed in the host's context (lesson from `duidtin-feature-beranda`).
2. An auth/context provider, so `userName` and `onLogout` stop being hardcoded and the menu can adapt to roles.
3. Per-module i18n.
