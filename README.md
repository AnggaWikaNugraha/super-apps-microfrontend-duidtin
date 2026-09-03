# x-duidtin

**English** · [Bahasa Indonesia](README.id.md)

A Module Federation-based microfrontend super-app.

Planned parts:

- **`duidtin-ui/`** (later, port 3000) — the host: shell, routing, consumer of every remote.
- **`duidtin-ui-design-system/`** (port 3001) — global components & styles, exposed as a Module Federation remote. 13 components, working.
- **`duidtin-ui-layout/`** (port 3002) — header/footer, the shared layout wrapped around every page. Working, and proven to consume design-system components through `loadRemote()`.

Implementation details for each part live in that folder's own README. This document focuses on the overall architecture flow.

What's left: the `duidtin-ui` host. The two remotes above now run as a pair (`duidtin-ui-layout` is the design system's first consumer), so the MF path has been exercised for real in a browser before the host even exists.

---

## Architecture flow

### 1. Build time

```
next.config.js (duidtin-ui)
  └─▶ federation plugin registered
        remotes: {}   ← deliberately empty, resolved at runtime rather than build time
        exposes: {}   ← the host is only a consumer, never a remote for other repos
```

### 2. Boot

```
pages/_app.tsx (top level, before anything renders)
  └─▶ federationInit()                          [services/federation/init.ts]
        ├─▶ getAllFeatures()                     [services/federation/registry.ts] → every remote: global + per-feature
        ├─▶ getModuleEntry(name)                  [services/federation/registry.ts] → each remote → environment URL
        ├─▶ init({ name, remotes, plugins })       → register every remote with the MF runtime (nothing fetched yet)
        ├─▶ window.__FEDERATION_LOADED = true
        └─▶ dynamicLoadStyles(globalFeatures)       [services/federation/loader.ts] → loadRemote(name + "/globals")
                                                       (design-system, layout — prevents a flash of unstyled content)
```

### 3. Per-page preload

```
provider.tsx useEffect
  └─▶ waitForFederation()                         [components/federation/provider.tsx]
  └─▶ loadModulesByRoute(router.pathname)          [services/federation/useModuleLoading.ts]
        ├─▶ getModulesForRoute(route)              [registry.ts] → filter features, yields the names that match
        └─▶ for EACH matching module, IN PARALLEL:
              ├─▶ loadLocalesForModule(moduleName)   → load i18n files
              └─▶ loadModule(moduleName)             [useModuleLoading.ts]
                    └─▶ dynamicLoadStyles(moduleName) [loader.ts] → loadRemote(name + "/globals")
                                                         (warms the container up, does NOT render yet)
```

### 4. The actual render

```
pages/<feature>/<sub-page>/index.tsx
  └─▶ loadRemote("<remote-name>/<sub-page>")        → fetch the component's JS chunk + RENDER
  └─▶ loadRemote("duidtin_ui_layout/default")         → the layout, a separate remote, wraps the content
```

### 5. Error handling

```
RetryPlugin          → loadEntryError/getModuleFactory hooks → script fetch failed (network) → retry a few times
fallbackPlugin        → errorLoadRemote hook, after retries are exhausted → swap the module for a fallback component
RemoteErrorBoundary   → a React error boundary wrapping {children} → module loaded fine but CRASHED while rendering
```
