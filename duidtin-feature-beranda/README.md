# duidtin-feature-beranda

**English** · [Bahasa Indonesia](README.id.md)

The home page (corporate dashboard), exposed as a Module Federation remote and rendered by the `duidtin-ui` host at route `/`.

This repo is **deliberately built on a different stack from every other duidtin repo** — Next 16 + Rspack + Module Federation 2.x, while the host, layout and design system are still Next 14 / Rslib on MF 0.24.1. The point is to prove Module Federation's central claim: each remote may bring its own toolchain, as long as the contract lines up.

## Getting started

This repo consumes `duidtin-ui-design-system` and is only visible through the host, so three servers must be running:

1. `../duidtin-ui-design-system/` → `bun run dev:producer` (`:3001`)
2. `../duidtin-ui-layout/` → `bun run dev` (`:3002`)
3. This folder → `bun install` then `bun run dev` (`:3003`)
4. `../duidtin-ui/` → `bun run dev` (`:3000`) ← **open this one**

Opening `http://localhost:3003/beranda` only shows a guard page, not the dashboard.

## Current status

Verified working in a browser:

- `./base` is rendered by the host through `loadRemote("duidtin_feature_beranda/base")` at route `/`.
- **MF 0.24.1 and 2.x are proven to talk to each other** — the most important result here, and previously unknown.
- `Card`, `Button`, `Badge` and `Alert` are pulled at runtime from `duidtin_ui_design_system`, so the chain is: host (0.24.1) → beranda (2.x) → design system (0.24.1).
- This is the first feature remote, so **PHASE 2 in the host finally runs for real** — before this, `featureRegistry` was empty and the loop did zero iterations.
- Design-system types are generated into `@mf-types/` automatically — cross-repo `dts` works across MF versions too.

Not there yet:

- Real data. The balance is a sample figure; the "pending approval" and "recent activity" blocks are deliberately left honestly empty, waiting for the Payroll and Statement features.
- Auth and roles. Every shortcut is still `isDisabled`.
- i18n, deploy/container config.

## The stack — and why it differs

| | Choice | Reason |
|---|---|---|
| Framework | Next.js 16.2.9 | exploration; also aligns with `qcash-ui-dashboard-dhe` |
| Bundler | **Rspack** (`next-rspack` 16.2.9) | Turbopack (Next 16's default) **does not support** Module Federation |
| MF plugin | `@module-federation/enhanced` 2.9.0 | `nextjs-mf` stops at Next 14, no Next 15+ support |
| React | 18.3.1 | **must** match the host — it is shared as a singleton |
| Styling | Tailwind v4, prefix `fber` | BEM + `@apply`, the same pattern as the layout (`lyt`) and host (`app`) |
| Port / basePath | 3003 / `/beranda` | |

## Folder structure

```
duidtin-feature-beranda/
  containers/beranda/
    index.tsx            # EXPOSED as "./base"
  scripts/
    build-styles.ts      # compiles Tailwind → a string, see the styling section
  components/remote/
    design-system.tsx    # loadRemote bridge to duidtin_ui_design_system
  services/
    federation.ts        # ← remote registration, see "Snags" item 4
  constants/federation.ts
  utils/index.ts         # getBaseFederationUrl()
  pages/
    _app.tsx             # DELIBERATELY empty
    index.tsx            # guard page
  styles/
    globals.css          # @import tailwindcss prefix(fber) + beranda.css
    beranda.css          # BEM classes + @apply
    global.exposes.ts    # GENERATED, exposed as "./globals" — gitignored
  next.config.ts
```

## Module Federation config

No wrapper plugin like `nextjs-mf` — the plugin is installed by hand in the `webpack()` hook:

```ts
import withRspack from "next-rspack";
import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";

webpack(config, { isServer }) {
  config.cache = false;
  if (!isServer) {                       // the MF container only matters in the browser
    config.optimization.runtimeChunk = false;
    config.output.uniqueName = "duidtin_feature_beranda";
    config.output.chunkLoadingGlobal = "webpackChunkduidtin_feature_beranda";
    config.plugins.push(new ModuleFederationPlugin({ ... }));
  }
  return config;
}
export default withRspack(nextConfig);
```

### Three deliberate departures from `qcash-ui-dashboard-dhe`

This config follows dhe's, but **three things are intentionally different**:

**1. An absolute `assetPrefix`, not `output.publicPath = "auto"`.**
dhe uses `"auto"` and that is correct **there**, because its remote is proxied through the host's origin (`scripts/dev-host-compat.mjs`). The duidtin host proxies nothing, so `"auto"` would make chunks be requested from `:3000` and 404 — exactly the snag `duidtin-ui-layout` already hit. Here it is `assetPrefix: process.env.MF_PUBLIC_PATH`, set to `http://localhost:3003/beranda` in dev and left empty in production.

**2. `shared` is written by hand.**
`nextjs-mf` (used by the host and layout) quietly shares `react`/`react-dom`, which is why they can write `shared: {}`. `enhanced` does **not**:

```ts
shared: {
  react:       { singleton: true, requiredVersion: false },
  "react-dom": { singleton: true, requiredVersion: false },
}
```

Drop those lines and React is duplicated, producing an immediate `Invalid hook call`.

**3. Build-time `remotes` is left empty.**
dhe registers `qui` in its config. Here `remotes` is empty and registration happens only at runtime — the lesson from snag 7 in `duidtin-ui-layout`: if the same name is registered at build time **and** at runtime, the build-time one wins and the runtime one is silently discarded, so the dev URL gets baked all the way into production.

## A dual role

This repo is a **remote for the host**, and at the same time a **consumer of another remote**:

```
duidtin-ui (host, MF 0.24.1)
  └─▶ loadRemote("duidtin_feature_beranda/base")
        └─▶ containers/beranda/index.tsx        (MF 2.x)
              └─▶ loadRemote("duidtin_ui_design_system/components/card")
                    └─▶ duidtin-ui-design-system  (MF 0.24.1)
```

Two repo boundaries and two MF version crossings inside a single render tree.

## Styling — Tailwind, but by a detour

Tailwind v4 with the `fber` prefix, using the same BEM + `@apply` pattern as the layout (`lyt`) and the host (`app`). Colours come from the design system's `var(--dtn-*)` tokens, so Tailwind here only handles layout and sizing:

```css
.fber-page {
  @apply fber:flex fber:flex-col fber:gap-5;
}
```

Two easily-confused forms:

| | Form | Appears in |
|---|---|---|
| Class names | hyphen — `fber-page`, `fber-saldo__value` | JSX and the DOM |
| Tailwind utilities | colon — `fber:flex`, `fber:gap-5` | only inside `@apply` |

The second is Tailwind v4's native form for `prefix(fber)`.

### Why the CSS cannot simply be `import`ed

**Next forbids importing global CSS from any file other than `pages/_app.tsx`** — and an MF-exposed module (`./globals`) is plainly not `_app.tsx`. Each repo works around this differently:

| Repo | Its workaround |
|---|---|
| `duidtin-ui-layout` | a custom webpack rule (`style-loader`/`css-loader`/`postcss-loader`) |
| `qcash-ui-dashboard-dhe` | compile the CSS into a string, inject it manually via `<style>` |
| **this repo** | **same as dhe** — compiled into a string by `@tailwindcss/cli` |

The pipeline:

```
styles/globals.css                        @import tailwindcss prefix(fber)
  └─▶ scripts/build-styles.ts             runs automatically via predev/prebuild
        └─▶ styles/global.exposes.ts      GENERATED — the CSS as a string
              └─▶ ensureGlobalsStylesheet()   injects <style id="…-globals">
                    └─▶ called by the host in PHASE 2 via loadRemote(".../globals")
```

`styles/global.exposes.ts` is a **generated file** — never edit it by hand, and it is not committed. If the CSS looks stale, run `bun run style`.

## Snags we hit (and why the fixes look like that)

1. **`reactCompiler: { target: "18" }` killed the dev server.** Copied from dhe, it turns out to require `babel-plugin-react-compiler`: `Failed to load the babel-plugin-react-compiler`. Removed — it is an optional optimisation, and React 18 runs on Next 16 without it.

2. **`withRspack` and `--webpack` cannot be combined.** Next 16 defaults to Turbopack, so the first instinct is to add `--webpack`. The result: `Cannot call withRspack and pass the --webpack flag. Please configure only one bundler.` The `withRspack` wrapper alone is enough, with no flag.

3. **The banner prints `(Turbopack)` while Rspack is actually running.** Misleading — the banner is printed before the config is loaded. To confirm Rspack really engaged, look for `[Module Federation Manifest Plugin] Manifest Link:` in the log. If it is absent, the `webpack()` hook never ran and the MF plugin was never installed.

4. **`init()` in `pages/_app.tsx` is never executed — the most deceptive one.**
   First attempt: static text appeared, but **every design-system component was missing**, with no error at all.
   The cause: when beranda is loaded as a remote, the host only fetches the `./base` module. `_app.tsx` is this repo's own Next application entry and is **never run** in the host's context. So registration placed there only works when `:3003` is opened directly.
   `duidtin-ui-layout` escapes this trap not by being right, but because it has build-time `remotes` — which is precisely its own snag 7.
   The fix: registration moved into [`services/federation.ts`](services/federation.ts), called at **module scope** from the bridge file the container imports. That path definitely runs both through the host and standalone.

5. **This repo's MF runtime is a SEPARATE instance from the host's.** A consequence of item 4: the host already registered `duidtin_ui_design_system` in its registry, yet beranda still has to register it again. What instances share is the **shared scope** (React), not the remote registry.

## Next steps

- Fill the "pending approval" and "recent activity" blocks once the Payroll and Statement features exist.
- Wire the shortcuts to real routes (all of them are `isDisabled` today).
- Auth and roles: a maker should see different shortcuts from a checker.
- Real data replacing the sample figures.
