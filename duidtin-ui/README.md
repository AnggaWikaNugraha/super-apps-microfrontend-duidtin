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

What it returns today (2 items, since `featureRegistry` is still empty):

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

But look at how the provider actually consumes it:

```ts
const { loadModulesByRoute } = useModuleLoading();
//      ^^^^^^^^^^^^^^^^^^ this is all it takes
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
// out: []
// (with featureRegistry EMPTY as it is today, EVERY route → [])
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

> While `featureRegistry` is empty, `getModulesForRoute()` always returns `[]` and this entire phase is a **no-op**. The scaffolding is deliberate, so that adding the first feature remote is one registry entry rather than rebuilding the loading path.

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
