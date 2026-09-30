# duidtin-feature-beranda

**English** · [Bahasa Indonesia](README.id.md)

![Home](docs/beranda.png)

The home page (a corporate dashboard) exposed as a Module Federation remote and rendered by the `duidtin-ui` host at route `/`.

This is **the only duidtin repo that is not React** — Vue 3 + Rsbuild, while the host, the layout and feature-auth are all React. The point is to prove Module Federation's strongest claim: a remote may bring its own **framework**, not merely its own toolchain. And the components are still the same design-system components, used through the `<dtn-*>` Web Component wrappers.

## Getting started

This repo consumes `duidtin-ui-design-system` and `duidtin-api`. To see the home page with data, five servers must be running:

1. `../duidtin-api/` → `bun run db:lokal`, then `bun run dev` (`:4000`)
2. `../duidtin-ui-design-system/` → `bun run dev:producer` (`:3001`)
3. `../duidtin-ui-layout/` → `bun run dev` (`:3002`)
4. This folder → `bun install`, then `bun run dev` (`:3003`)
5. `../duidtin-ui/` → `bun run dev` (`:3000`) ← **open this one**, then log in

Unlike the Next version, `http://localhost:3003/beranda` now shows **the real home page**, not a placeholder — only the design system on `:3001` needs to be up. See [The host contract](#the-host-contract).

> **The dev page on `:3003` has no data.** Now that the data comes from the API, every request needs a session — and the session lives in `localStorage` on the `:3000` origin, not `:3003`. So on `:3003` all four blocks show the **error** state with "Belum login", without a single wasted request (`http` rejects them client-side). That is still useful for layout work; for real data, open it through the host. `?kosong=` still works there too.

## Where it stands

Verified in a real browser (through the host on `:3000` and standalone on `:3003`, zero console errors):

- `./base` returns a `mount(el)` function; the React host calls it through `components/federation/remote-mount.tsx`. **Vue renders inside a React tree with no framework adaptor at all.**
- All five blocks render: 5 `<dtn-card>`, 10 `<dtn-badge>` (every label intact), 3 accounts, 4 table rows.
- **The Vue `useAuth()` reads the session store the React host installed** — the heading says "Selamat datang, Angga." with no props passed down by the host. This is the most direct proof that `@duidtin/auth` really is framework-agnostic.
- The Zustand stores work from Vue: the eye icon hides the balance, the activity filter cuts 4 rows down to 1.
- `press` from `<dtn-button>` is caught by Vue (`@press`), and `:is-disabled` reaches the React component inside — the Refresh button turns into "Memperbarui" and goes disabled.
- `?gagal=rekening,aktivitas` → 3 blocks fail with a "Coba lagi" button, the global banner appears, the approvals block keeps rendering.
- `?lambat=20` → skeletons appear with the right number of lines (2 / 5 / 5 / 5).
- **The data comes from `duidtin-api`, no longer from mocks.** Three requests to `localhost:4000/beranda/*`, all `200` with a `Bearer` header, and `rekening` is fetched **once** even though two blocks use it — TanStack's dedup proven. The figures match the dummy data they replaced exactly: Rp 1,228,550,000.
- `?kosong=rekening,persetujuan` → three blocks show the EMPTY state. That path had **never been proven** while the data was dummy, because the mocks were never empty.

Not there yet:

- Its own account-list / statement pages. The home page only shows the summary.
- Roles. Every shortcut is still disabled.
- i18n and container config (Docker).

## House rules for feature repos

Three rules that hold across every `duidtin-feature-*` repo, to keep feature repos thin and uniform. Here the word is "composable", but the rule is identical to the React repos.

### 1. Every action and every piece of per-section logic lives in a composable

Components **only render**. No `useQuery`, no handlers, no calculations inside them. One section = one composable.

```vue
<!-- ❌ don't -->
<script setup lang="ts">
const { data } = useQuery({ queryKey: …, queryFn: … });
const total = computed(() => (data.value ?? []).reduce((a, b) => a + b.saldo, 0));
</script>

<!-- ✅ do this -->
<script setup lang="ts">
const { total, jumlahRekening, isLoading, isError, retry } = useRingkasanSaldo();
</script>
```

**Why:** the component can be read at a glance; the logic can be tested without rendering; and when the data source changes the template is never touched. That has been proven once already: swapping dummy data for `duidtin-api` touched only `services/api/`, with zero changes in `blocks/` or `composables/`.

### 2. State goes in Zustand, not a `ref` in the component

**Why:** state used across blocks (period filter, selected account) needs no prop drilling. And in an MFE specifically, state that lives in a store survives the host unmounting and remounting the remote — with a component `ref`, all of it is lost.

The store is `zustand/vanilla` (the main package ships React hooks), with a six-line bridge in [`utils/zustand-vue.ts`](utils/zustand-vue.ts). `@duidtin/auth/vue` uses the same pattern.

### 3. UI comes from the design system; do not build local reusable components

If a component does not exist yet, **build it in `duidtin-ui-design-system`** — not in the feature repo.

| Allowed in a feature repo | Belongs in the design system |
|---|---|
| Compositions specific to this feature (the home blocks) | UI primitives (button, card, skeleton) |
| The feature's composables & stores | Patterns used across features (empty state, data state) |

**Why:** a reusable component built locally gets duplicated in every feature, and the design system loses its purpose.

### Where it stands: all three are followed

| Rule | How it shows up here |
|---|---|
| 1 | `composables/use-*.ts` — one per block. The components in `blocks/` only render |
| 2 | `stores/error-global.ts`, `stores/tampilan-beranda.ts` — Zustand, no `ref` state in components |
| 3 | `<dtn-card>`, `<dtn-badge>`, `<dtn-button>`, `<dtn-alert>`, `<dtn-skeleton>`, `<dtn-data-state>` all come from the design system |

**One agreed exception, and one forced on us:**

- `buatQueryClient()` is called inside `mount()`, not at module level. That is not application state but an **instance holder** — if it were global, a stale cache would cling on when the host remounts this remote.
- `containers/beranda/components/error-boundary.vue` is **a local component even though rule 3 forbids it**. The reason is in [the error section](#three-layers-of-error-handling): the design system's `ErrorBoundary` cannot be wrapped as a Web Component, and Vue's mechanism is a different thing entirely.

**A pleasant side effect of rule 2:** `QueryCache.onError` lives outside any component, so it cannot use a composable. With a store it simply calls `storeErrorGlobal.getState().setPesan(...)`.

## The stack — and why it differs

| | Choice | Reason |
|---|---|---|
| Framework | **Vue 3.5** | proves a remote may differ in framework, not just in bundler |
| Bundler | **Rsbuild 1.x** | no Next: the home page needs neither routing nor SSR, it is only rendered by the host |
| MF plugin | `@module-federation/rsbuild-plugin` **0.24.1** | **exactly** the design system's version — the remote this repo talks to most |
| UI components | `<dtn-*>` Web Components | the design system's React components, used with no React on this side |
| React | **not installed** | see [Why there is no React](#why-there-is-no-react-in-the-dependencies) |
| Data | `@tanstack/vue-query` 5 | its own `QueryClient` |
| API | `duidtin-api` through `http` from `@duidtin/auth` | base URL from `PUBLIC_API_URL`, set by this repo itself |
| Session | `@duidtin/auth` + the `/vue` subpath | the very same store as the host |
| Styling | Tailwind v4, prefix `fber` | BEM + `@apply`, same as the layout (`lyt`) and the host (`app`) |
| Port / base | 3003 / `/beranda` | |

## Folder layout

```
duidtin-feature-beranda/
  expose/
    base.ts              # WHAT IS EXPOSED as "./base" — mount(el) → unmount
  entry/
    dev.ts               # dev-page entry; the async boundary MF asks for
    dev-app.ts           # calls the same mount() the host calls
  containers/beranda/
    index.vue            # the page frame: 5 blocks + 3 error layers
    blocks/*.vue         # RULE 1 — components only render
    components/
      error-boundary.vue # onErrorCaptured, standing in for React's ErrorBoundary
      page-heading.vue   # uses the Vue useAuth()
      global-error-banner.vue
      icon.vue · format.ts
  composables/           # RULE 1 — one per block
    use-ringkasan-saldo.ts · use-rekening-perusahaan.ts
    use-antrean-persetujuan.ts · use-aktivitas-terakhir.ts · use-page-heading.ts
  stores/                # RULE 2 — zustand/vanilla
    error-global.ts · tampilan-beranda.ts
  services/
    federation.ts        # registers the design system + loads the <dtn-*> wrappers
    query-client.ts
    api/client.ts        # apiGet() — http from @duidtin/auth + the dev switches
    api/beranda.ts       # query functions + queryKeys
    api/tipe.ts          # mirror of duidtin-api's response shapes
  utils/
    index.ts             # getBaseFederationUrl()
    zustand-vue.ts       # store → ref bridge
  types/
    global.d.ts          # window.__DUIDTIN_REMOTE_ENTRY__ (filled by the host)
    dtn-elements.d.ts    # <dtn-*> types for vue-tsc
  styles/
    globals.css          # @import tailwindcss prefix(fber) + beranda.css — exposed as "./globals"
    beranda.css          # BEM classes + @apply
  index.html             # the dev page
  rsbuild.config.ts · postcss.config.mjs
  vercel.json            # buildCommand + outputDirectory + ignoreCommand
```

## The host contract

The host is a React application. React cannot render a Vue component, nor the other way round. The only thing that crosses the boundary is **DOM**, so the contract is inverted: what is exposed is not a component but a function.

```ts
// expose/base.ts — the remote's side
export const mount = (el: HTMLElement): (() => void) => { … };

// components/federation/remote-mount.tsx — the host's side
const lepas = mount(wadah.current);   // inside useEffect
return () => lepas();                 // on cleanup
```

All the host knows is "here is an empty `<div>`, call this function". A Svelte or Angular remote later will use the same `RemoteMount` with not one line changed in the host.

The consequence to remember: **everything that must run in both situations goes in `expose/base.ts`**, not in `entry/`. When the host renders this remote, `entry/` is never executed. This is the expensive lesson from the React version, which once put the remote registration in `pages/_app.tsx` and made every design-system component disappear **without a single error message**.

## Components: `<dtn-*>`, not React components

```
services/federation.ts
  init({ name: "duidtin_feature_beranda", remotes: [design-system] })
  ├─ loadRemote("duidtin_ui_design_system/globals")                  → --dtn-* tokens + ui-* classes
  └─ loadRemote("duidtin_ui_design_system/component-wrapper/semua")  → customElements.define("dtn-card", …)
        └─▶ from then on <dtn-card> works in any Vue template like a plain HTML tag
```

`./components/<n>` is **not used** here — those are React components. What is used is `./component-wrapper/semua`, a module whose only job is a side effect: registering the elements. Inside each element a React root runs the original component, with exactly the same CSS classes.

| Thing | Shape |
|---|---|
| Props | kebab-case attributes — `:is-disabled="isFetching"`, `:lines="5"` |
| Events | bubbling `CustomEvent` — `@press`, `@retry` |
| Content | ordinary light-DOM children — `<dtn-badge>Data contoh</dtn-badge>` |
| Types | `types/dtn-elements.d.ts`, written by hand (see below) |

Three things to be aware of:

**1. `isCustomElement` is mandatory.** In `rsbuild.config.ts` the Vue compiler is told that `dtn-*` is an element, not a component. Without it Vue warns "Failed to resolve component" and — more importantly — passes values as DOM properties rather than attributes, so the wrapper's `attributeChangedCallback` never fires.

**2. Props that are ReactNodes cannot cross.** `DataState`'s `loadingFallback` is a React element; there is no attribute form of it. So the LOADING state is handled by `v-if` in Vue, and `<dtn-data-state>` covers what can actually be expressed as attributes: empty and error.

**3. The types are hand-written, not from `@mf-types`.** The design system's type archive holds **React** types (`ComponentProps<typeof Button>`), which mean nothing in a Vue template. So `scripts/ambil-tipe-design-system.ts`, `fflate`, and the `react-aria-components` + `tailwind-variants` devDependencies are all gone from this repo, replaced by `types/dtn-elements.d.ts` declaring `GlobalComponents`. The price: when a variant is added in the design system, that file has to follow by hand.

### Why there is no React in the dependencies

Even though `<dtn-*>` runs React inside. The key is on the design system's side: it shares `react` and `react-dom` as singletons **with a fallback**, so

```
rendered by the host → the share scope already holds the host's React → that one is used
opened standalone    → the share scope is empty                      → the design system's own copy
```

That is why `shared: {}` in `rsbuild.config.ts` really is empty, and this repo carries zero lines of React. It is a conclusion that only became clear after reading the design system's `mf-manifest.json` — the initial assumption was the opposite, that React had to be supplied from here.

## Session: the Vue `useAuth()`

```ts
import { useAuth } from "@duidtin/auth/vue";

const { user } = useAuth();   // user.value, or {{ user?.nama }} in a template
```

The store is the `zustand/vanilla` one the host parks on `window.__DUIDTIN_AUTH__`. The only difference from the React version is how it subscribes (~25 lines in the auth package); the statuses, the expiry timer, `localStorage` and the axios interceptors are identical. Logging in through the host's React modal changes the greeting here, with no props involved.

The auth package is installed via `file:../duidtin-packages/auth`, and its `dist` is not in git — hence the `prebuild` that builds it first, exactly as the host does.

## Module Federation config

```ts
pluginModuleFederation({
  name: "duidtin_feature_beranda",
  filename: "static/remoteEntry.js",
  exposes: {
    "./base": "./expose/base.ts",
    "./globals": "./styles/globals.css",   // CSS directly, not compiled into a string
  },
  shared: {},                               // see "Why there is no React"
  dts: false,                               // nothing consumes this remote's types
})
```

The host registry's `entryPath` changes with it: `/beranda/static/remoteEntry.js`, without the `_next/static/chunks` segment — the same shape as the design system, which is also not Next.

**Build-time `remotes` stays empty.** The design system is registered at runtime only — the lesson from `duidtin-ui-layout`: when the same name is registered both at build time and at runtime, the build-time one wins and the runtime one is silently dropped, so the dev URL gets baked all the way into production.

**`dev.hmr` and `dev.liveReload` are off.** The rsbuild dev client that gets injected into `remoteEntry.js` calls `location.reload()` on the **consumer's** page — the host page then reloads forever and the remote component never gets a chance to render. Same reason as the design system.

### Loaded from the production host during dev

Run `bun run dev` here, then open `https://super-apps-duidtin.vercel.app/?remote-lokal=duidtin_feature_beranda@3003`. Details in the host README, section *Dev without running every server*.

> **Requires a redeployed host.** `entryPath` is baked into the host bundle, so a production host that has not been updated still asks for `/beranda/_next/static/chunks/remoteEntry.js` — a Next path that no longer exists here, which shows up as `remote offline`. And even if it did resolve, the old host still renders `./base` as a React component, while it is now a `mount()` function. Until the new host is live, use the local host (`:3000`).

Two things here make it work:

- **`server.headers: { "Access-Control-Allow-Origin": "*" }`** in `rsbuild.config.ts`. Simpler than the Next version, which needed an `allowedDevOrigins` hostname list because Next 16 answers cross-site `/_next/*` script requests with a 403.
- **`siapkanDesignSystem()` uses the host's `window.__DUIDTIN_REMOTE_ENTRY__`** when present. The MF runtime here is its own instance, so without it the home page would register the design system at a URL it computed itself and would miss the host's `?remote-lokal` override and publish mode.

## A double role

This repo is **a remote to the host** and at the same time **a consumer of another remote**:

```
duidtin-ui (host, React, MF 0.24.1)
  └─▶ loadRemote("duidtin_feature_beranda/base") → mount(el)
        └─▶ the Vue app                          (MF 0.24.1)
              └─▶ loadRemote("duidtin_ui_design_system/component-wrapper/semua")
                    └─▶ duidtin-ui-design-system (React inside a Web Component)
```

Two repo boundaries, two framework switches (React → Vue → React), in one DOM tree.

## Styling — Tailwind, prefix `fber`

The same BEM + `@apply` pattern as the layout (`lyt`) and the host (`app`). Colours come from the design system's `var(--dtn-*)` tokens, so Tailwind here only handles layout and sizing:

```css
.fber-page {
  @apply fber:flex fber:flex-col fber:gap-5;
}
```

Two forms that are easy to confuse:

| | Form | Appears in |
|---|---|---|
| Class name | hyphen — `fber-page`, `fber-saldo__value` | templates and the DOM |
| Tailwind utility | colon — `fber:flex`, `fber:gap-5` | only inside `@apply` |

The second is Tailwind v4's own format for `prefix(fber)`.

### What went away along with Next

The Next version had to compile Tailwind into a **string** through `scripts/build-styles.ts`, because Next forbids importing global CSS from any file other than `pages/_app.tsx` — and an MF-exposed module is clearly not `_app.tsx`. Rsbuild has no such rule:

```
styles/globals.css  →  exposes: { "./globals": "./styles/globals.css" }
```

One config file, zero generator scripts, zero generated files to gitignore. Tailwind comes in through `postcss.config.mjs`, which Rsbuild picks up on its own.

## Application & data flow

### 1. Application flow — from the host to a rendered block

```
Browser opens localhost:3000/
  └─▶ host duidtin-ui — pages/index.tsx
        │  the host's PHASE 2 has already warmed the container:
        │    loadRemote("duidtin_feature_beranda/globals")   → <style> fber-*
        │
        │  <RemoteMount modul="duidtin_feature_beranda/base" />
        ▼
      expose/base.ts — mount(el)
        ├─ siapkanDesignSystem()                      ← AWAITED before the app mounts
        │    ├─ init({ name: "duidtin_feature_beranda", remotes: [design-system] })
        │    ├─ loadRemote(".../globals")                  → --dtn-* tokens + ui-* classes
        │    └─ loadRemote(".../component-wrapper/semua")  → <dtn-*> registered
        ├─ createApp(Beranda)
        ├─ app.use(VueQueryPlugin, { queryClient: buatQueryClient() })
        └─ app.mount(el)
             └─▶ containers/beranda/index.vue
                  ├─ <PageHeading>                    → usePageHeading() + useAuth()
                  ├─ <GlobalErrorBanner>              → the error-global store
                  ├─ ErrorBoundary › <RingkasanSaldo>     → useRingkasanSaldo()
                  ├─ ErrorBoundary › <Pintasan>           → static, no query
                  ├─ ErrorBoundary › <RekeningPerusahaan> → useRekeningPerusahaan()
                  ├─ ErrorBoundary › <AntreanPersetujuan> → useAntreanPersetujuan()
                  └─ ErrorBoundary › <AktivitasTerakhir>  → useAktivitasTerakhir()
```

The design system is **awaited** before the app mounts. An unregistered `<dtn-*>` element would in fact upgrade itself the moment `customElements.define` runs, so rendering first would not break anything — it would just flash unstyled content for an instant. Waiting costs less than that flash, especially since the container is usually already warm from PHASE 2.

### 2. Data flow — one query from the API to the screen

Example: the `rekening` query feeding the Balance summary block.

```
duidtin-api — GET /beranda/rekening
  filtered by perusahaanId from the token claims   3 accounts — 2 IDR, 1 USD
  │
services/api/beranda.ts
  ambilRekening() → apiGet<Rekening[]>("rekening")
  │
services/api/client.ts — apiGet(endpoint)
  ├─ ?lambat=N   → wait N × 300ms first
  ├─ ?gagal=…    → throw ApiError(endpoint, 503), without calling the API
  ├─ ?kosong=…   → return [], without calling the API
  ├─ http.get(`/beranda/${endpoint}`)              ← the instance from @duidtin/auth
  │    ├─ attach Bearer · proactive refresh · hold while the session is expired
  │    └─ no session → rejected client-side, no wasted request
  └─ AuthError → ApiError(endpoint, status, message)
  │
TanStack Vue Query
  useQuery({ queryKey: ["beranda", "rekening"], queryFn: ambilRekening })
  cache per queryKey · retry 1 · staleTime 60s · no refetch on window focus
  │
composables/use-ringkasan-saldo.ts     ← does the work; the component calculates nothing
  computed(() => data.value ?? [])  →
    total                = Σ IDR balances → 1,228,550,000
    totalValas           = Σ USD balances → 55,950,000
    jumlahRekening       = 3
    jumlahRekeningRupiah = 2 · jumlahRekeningValas = 1
    isLoading = isPending · isError · isEmpty · retry()
  + from the tampilan-beranda store: terlihat, toggleSaldo
  │
containers/beranda/blocks/ringkasan-saldo.vue   ← only renders
  v-if="isLoading" → <dtn-skeleton> + <dtn-skeleton-lines :lines="2">
  v-else           → <dtn-data-state :is-empty :is-error @retry>
                       {{ terlihat ? rupiah(total) : "••••••••" }}
```

Everything is `computed`, not a plain variable: vue-query's `data` is a ref, so a calculation read once would freeze at its first value (usually `undefined`).

IDR and USD balances are **not added together** — they are shown separately, because summing currencies needs an exchange rate.

The full query-to-block map:

| `queryKey` | Function | `?gagal=` | Composable | Block |
|---|---|---|---|---|
| `["beranda", "rekening"]` | `ambilRekening` | `rekening` | `useRingkasanSaldo`, `useRekeningPerusahaan` | Balance summary, Company accounts |
| `["beranda", "persetujuan"]` | `ambilPersetujuan` | `persetujuan` | `useAntreanPersetujuan` | Approval queue |
| `["beranda", "aktivitas"]` | `ambilAktivitas` | `aktivitas` | `useAktivitasTerakhir` | Recent activity |

The first row matters most: two composables use the same `queryKey`, so TanStack collapses them into **one request** — and they always fail or succeed together.

### 3. User-action flow

```
Click the eye icon — Balance summary
  toggleSaldo()                               composable → store
  └─▶ storeTampilanBeranda: saldoTerlihat = !saldoTerlihat
        └─▶ bacaStore() updates the ref → template re-renders → "••••••••"
  No request. The state survives the host remounting this remote.

Click a filter Semua / Masuk / Keluar — Recent activity
  setFilter("masuk")                          = pilihFilterAktivitas
  └─▶ store: filterAktivitas = "masuk"
        └─▶ computed: ditampilkan = aktivitas.filter(item.arah === filter)
              └─▶ "Menampilkan 1 dari 4 transaksi"
  No request — it filters data already in the cache.

Click Refresh — PageHeading
  <dtn-button @press="perbarui">
  └─▶ React Aria onPress → bubbling CustomEvent("press") → the Vue handler
        └─▶ queryClient.invalidateQueries({ queryKey: ["beranda"] })
              └─▶ all three "beranda"-prefixed queries refetch together
  useIsFetching(...) > 0 → :is-disabled → the is-disabled attribute → the React component goes disabled
```

On **Refresh** no skeleton appears. `isPending` is only `true` when there is no data at all; during a refetch the old data stays on screen until the new data arrives.

### 4. Failure flow — one dead endpoint

```
localhost:3000/?gagal=rekening
  apiGet("rekening") → throw ApiError("rekening", 503)
  └─▶ TanStack retries once → still failing
        │
        ├─▶ QueryCache.onError                 once per failed query
        │     ├─ console.error("[beranda] query gagal: rekening")
        │     └─ storeErrorGlobal.getState().setPesan("Sebagian data gagal dimuat (rekening)…")
        │           └─▶ <GlobalErrorBanner> appears · "Tutup" → bersihkan()
        │
        └─▶ composable: isError = true
              ├─ Balance summary   → <dtn-data-state> error + "Coba lagi" → refetch()
              └─ Company accounts  → the same, because the queryKey is the same
            Approval queue & Recent activity keep rendering — different queryKeys.

A component crashes while rendering — a bug, not the API
  └─▶ that block's own <ErrorBoundary title="…"> catches it → the other blocks stay up
```

`QueryCache.onError` lives outside any component, so it writes to the store through `getState()`.

## Data: TanStack Query + `duidtin-api`

### Why the `QueryClient` belongs to this repo

It is not shared from the host. The consequence: the cache is not shared between feature remotes — if two features ever fetch the same data, both will fetch it. The trade is independence: the host needs to know nothing about TanStack Query, and this repo can change versions without disturbing anyone.

Here that trade has no alternative anyway: the host uses `@tanstack/react-query`, this repo `@tanstack/vue-query`. Two different packages, so not even a share scope could unify them.

### The transport

```
services/api/tipe.ts    mirror of duidtin-api's response shapes
services/api/client.ts  apiGet() — http from @duidtin/auth + the dev switches
services/api/beranda.ts query functions + queryKeys
```

The endpoint is just the block's name (`"rekening"`), and that name is **the same in three places**: the `queryKey`, the `?gagal=` value, and the `GET /beranda/rekening` path in the API. So none of the three can drift from the others.

**The axios instance comes from `@duidtin/auth`**, it is not created here — that is the only way to call the API with a session. What the instance brings: the `Bearer` header, a proactive refresh when the access token is nearly dead, holding requests while the session is expired and replaying them after a re-login, and rejecting client-side when there is no session at all. Everything it throws is an `AuthError`; `apiGet` turns that into an `ApiError` so the rest of the repo knows only one error type — and so `QueryCache.onError` can name which endpoint failed.

**The base URL is set by this repo**, in `expose/base.ts`:

```ts
configureAuth({ baseUrl: import.meta.env.PUBLIC_API_URL ?? "http://localhost:4000" });
```

The host calls `configureAuth()` too, but its value never reaches here: `baseUrl` is module state, and `@duidtin/auth` is deliberately **not** shared through MF — every remote bundles its own copy of the package. The only thing shared across remotes is the STORE, through `window.__DUIDTIN_AUTH__`. The env var is `PUBLIC_API_URL`, not `NEXT_PUBLIC_API_URL` as in the other repos, because Rsbuild only forwards variables prefixed with `PUBLIC_`.

**Three URL parameters for states that are hard to catch:**

| Parameter | Effect |
|---|---|
| `?gagal=aktivitas` | force that endpoint to fail, without calling the API. Several at once: `?gagal=aktivitas,persetujuan` |
| `?kosong=rekening` | force that endpoint to return `[]` — the only way to see the EMPTY state without deleting data from the database |
| `?lambat=30` | add a 30 × 300ms delay so the skeletons are actually visible; the local API answers in tens of milliseconds |

Deliberately deterministic through the URL, **not random failure** — random failure is maddening during development and impossible to demo. All three stay even now that the data is real, because those three states are precisely the ones a healthy API makes hardest to reach.

## Three layers of error handling

| Layer | Handles | Where |
|---|---|---|
| 1. `<dtn-data-state>` | a **failed query** — per block | from the design system |
| 2. `<ErrorBoundary>` | a **crash while rendering** — per block | `containers/beranda/components/error-boundary.vue` |
| 3. `<GlobalErrorBanner>` | every failed query, in one place | through `QueryCache.onError` |

Layers 1 and 2 handle different failures: a failed query is not a crashed component. Both are installed **per block**, not per page, so one troubled block does not take the others down.

Layer 2 is the only one that does **not** come from the design system, and that is not an oversight. `ErrorBoundary` is deliberately left unwrapped: a React error boundary only catches errors inside its own React tree, while children slotted through the light DOM are not part of that tree — the element would *look* like it works while catching nothing. Vue has its own mechanism, and a simpler one: a single `onErrorCaptured`, no class component. The fallback markup uses the same design-system CSS classes, so it still looks uniform.

> Known limitation: the global banner shows only the **last** message. If two endpoints fail at once, only one is named. Enough to say "something is off", not to list everything.

The host also has a `RemoteErrorBoundary`, but that wraps the WHOLE application — one crash replaces the entire page. This one is finer-grained.

## Snags hit (and why the fixes look like this)

1. **`<dtn-badge>Data contoh</dtn-badge>` rendered EMPTY — and this was a design-system bug, not one here.**
   The wrapper moves the original children into the slot React renders, and it read `ref.current` from a `queueMicrotask` scheduled right after `render()`. That is too early: a React 18 root renders asynchronously, so when the microtask ran the slot did not exist yet and the children were hidden **forever**. The only elements that escaped were those that happened to get an attribute change afterwards — `<dtn-button>` looked correct purely because its `is-disabled` changed and the second render found the slot from the first commit.
   The fix in `component-wrapper/utils/inti.ts`: swap `createRef` for a **callback ref** with a stable identity, which React calls exactly at commit time. It closes the opposite case too — a component that renders no slot (e.g. `DataState` when empty or failed) receives `ref(null)`, so its children are hidden correctly.

2. **`lines` sat on the wrong element.** `<dtn-skeleton-lines>` ignored `lines` because the wrapper codegen only knew props for the parent element; `lines` ended up on `<dtn-skeleton>`, which does not use it. Fix: `propsBagian` in the design system's `peta.ts`, so compound parts may declare their own props. `:lines="5"` now really produces five bars.

3. **The assumption that "Vue must supply React" turned out to be wrong.** The original plan installed `react` + `react-dom` here and shared them as singletons, on the grounds that `<dtn-*>` needs React. Reading the design system's `mf-manifest.json` settled it: it already shares both **with its own fallback**. So the empty `shared: {}` is correct and this repo carries zero React — over 1 MB lighter than planned.

4. **The MF plugin tried to emit type declarations and failed.** `[ Module Federation DTS ] Failed to generate type declaration` — `tsc` cannot emit `.d.ts` from `.vue` files. Since nothing consumes this remote's types (the host uses the `mount(el)` contract), `dts: false` is the right answer, not something to patch around.

5. **`isCustomElement` is not optional.** Without it Vue treats `dtn-card` as an unregistered component. Beyond the console warning there is a subtler effect: values are passed as DOM properties rather than attributes — and the wrapper only observes attributes.

6. **A plain `.click()` on the inner `<dtn-button>` does work.** The first guess was that pointer events would have to be simulated, since React Aria uses `usePress`. Not so: one `click()` already produces a bubbling `CustomEvent("press")` that reaches the Vue handler. Verified over CDP.

## Next steps

- Fill the "Approval queue" and "Recent activity" blocks once Payroll and Statements exist.
- Wire the shortcuts to real routes (all disabled today).
- Roles: a maker sees different shortcuts from a checker.

## Business Banking revamp

The home page leads with the IDR balance, a separate USD balance, an account breakdown, the approval queue, and a transaction table filtered by direction. `saldo` is shown in each account's own currency; balances in different currencies are not summed without a rate. The Refresh button reloads every home-page query. Summary-balance visibility and the transaction filter live in `stores/tampilan-beranda.ts`, with the actions exposed through each section's composable. The shortcuts stay disabled until their feature routes exist.
