# x-duidtin

**English** · [Bahasa Indonesia](README.id.md)

A Module Federation-based microfrontend super-app.

The parts:

- **`duidtin-ui/`** (port 3000) — the host: shell, routing, consumer of every remote. Working.
- **`duidtin-ui-design-system/`** (port 3001) — global components & styles, exposed as a Module Federation remote. 13 components, working.
- **`duidtin-ui-layout/`** (port 3002) — header/footer, the shared layout wrapped around every page. Working, and proven in both directions: it consumes the design system, and the host consumes it.

Implementation details for each part live in that folder's own README. This document focuses on the overall architecture flow.

## Status

All three now compose into a single page, **verified in a browser** rather than merely building: `localhost:3000` shows the header and footer from `duidtin-ui-layout` wrapping host content, with `duidtin-ui-design-system` components pulled in through **two paths at once** — host → design system directly, and host → layout → design system.

React stays a **single instance** across all three repos. Concrete evidence: a button loaded through the layout and a button loaded directly by the host share the same React Aria ID prefix — had React been duplicated, the prefixes would differ.

Not there yet: **the first feature remote**. The host's `featureRegistry` is still empty, so section 4 (render) below is exercised only by the layout, and section 3 (per-page preload) is fully scaffolded but nothing runs through it.

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

### 1. Build time

```
next.config.mjs (duidtin-ui)
  └─▶ federation plugin registered
        remotes: {}   ← deliberately empty, resolved at runtime rather than build time
        exposes: {}   ← the host is only a consumer, never a remote for other repos
```

### 2. Boot

```
pages/_app.tsx (top level, before anything renders)
  └─▶ federationInit()                          [services/federation/init.ts]
        ├─▶ getAllFeatures()                     [services/federation/utils/registry.ts] → every remote: global + per-feature
        ├─▶ getModuleEntry(name)                  [services/federation/utils/module-entry.ts] → each remote → environment URL
        ├─▶ init({ name, remotes, plugins })       → register every remote with the MF runtime (nothing fetched yet)
        ├─▶ window.__FEDERATION_LOADED = true
        └─▶ dynamicLoadStyles(globalFeatures)       [services/federation/utils/loader.ts] → loadRemote(name + "/globals")
                                                       (design-system, layout — prevents a flash of unstyled content)
```

### 3. Per-page preload

```
provider.tsx useEffect
  └─▶ waitForFederation()                         [components/federation/provider.tsx]
  └─▶ loadModulesByRoute(router.pathname)          [components/federation/hooks/useModuleLoading.ts]
        ├─▶ getModulesForRoute(route)              [utils/registry.ts] → filters featureRegistry, WITHOUT globalFeatures
        └─▶ for EACH matching module:
              └─▶ loadModule(moduleName)             [hooks/useModuleLoading.ts]
                    └─▶ dynamicLoadStyles(moduleName) [utils/loader.ts] → loadRemote(name + "/globals")
                                                         (warms the container up, does NOT render yet)
```

`getModulesForRoute()` deliberately excludes `globalFeatures` — those were loaded unconditionally in section 2 and need no route matching.

> While `featureRegistry` is empty this section is **always a no-op**. The scaffolding is deliberate, so adding the first feature remote is one registry entry. `loadLocalesForModule()` (i18n) has no equivalent here yet.

### 4. The actual render

```
pages/<feature>/<sub-page>/index.tsx
  └─▶ loadRemote("<remote-name>/<sub-page>")        → fetch the component's JS chunk + RENDER
  └─▶ loadRemote("duidtin_ui_layout/default")         → the layout, a separate remote, wraps the content
```

This is what genuinely puts components on screen, and it is entirely independent of the registry — written by hand, one file per page, through the `getLayout` pattern. `ssr: false` is mandatory: the module is fetched at runtime from another origin and does not exist while Next prerenders on the server.

Today it is exercised only by the layout (`pages/index.tsx`), because no feature remote exists yet.

### 5. Error handling

```
RetryPlugin          → script fetch failed (network) → retry 3×, 1 second apart
fallbackPlugin        → errorLoadRemote hook, after retries are exhausted → swap the module for a fallback component
RemoteErrorBoundary   → a React error boundary wrapping {children} → module loaded fine but CRASHED while rendering
```

The first two layers are about failing to **LOAD**; the third is about a module that loaded successfully and then **crashed while rendering** — a case that never reaches the `errorLoadRemote` hook.

## Cross-repo snags already hit

Two failures with **exactly the same root cause**, found at two different moments — worth remembering because it will recur with every new remote:

| | Found when | Remote at fault | Symptom |
|---|---|---|---|
| 1 | the layout started consuming the design system | `duidtin-ui-design-system` | chunks requested from `:3002` (the layout's origin) |
| 2 | the host started consuming the layout | `duidtin-ui-layout` | chunks requested from `:3000` (the host's origin) |

Both: webpack's `publicPath` was `auto`, which resolves relative to **the page currently open**, not to the remote's own origin. `remoteEntry.js` loads fine, but the chunks inside it 404.

**The rule for every new remote:** during dev, `assetPrefix` (or `MF_PUBLIC_PATH`) **must be an absolute URL pointing at that remote's own origin**. Production doesn't need it — every remote shares one domain there and `basePath` is enough.

This bug is invisible from inside the remote's own repo: it only appears once some OTHER repo consumes it across origins.
