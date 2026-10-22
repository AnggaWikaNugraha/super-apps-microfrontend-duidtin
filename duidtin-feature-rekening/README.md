# duidtin-feature-rekening

**English** · [Bahasa Indonesia](README.id.md)

The company accounts list and detail, exposed as a Module Federation remote and rendered by the `duidtin-ui` host at `/rekening` and `/rekening/[id]`.

The **second Vue remote** after beranda. Its stack is deliberately identical — Vue 3.5 + Rsbuild + MF 0.24.1 — because what this repo tests is no longer "can Vue join at all" but three things beranda never faced: **one repo, two pages**, **data from the host into the remote**, and **state that must survive a page change**.

## Getting started

Two servers. The other remotes (design system, layout, auth) and the API come from their published versions — that is the host's dev default, see [`duidtin-ui/README.md`](../duidtin-ui/README.md#getting-started).

1. This folder → `bun install`, then `bun run dev` (`:3005`)
2. `../duidtin-ui/` → `bun run dev` (`:3000`)
3. Open `localhost:3000/rekening?remote-lokal=duidtin_feature_rekening@3005` once, then log in

`?remote-lokal` is required: rekening has not been published, so without it the host has nowhere else to load it from. The API is set in [`.env.development`](.env.development) — this bundle calls `configureAuth()` itself, so it must point at the same API as the host. If the host runs everything locally, override it with `PUBLIC_API_URL=http://localhost:4000` in `.env.local`.

The dev page at `:3005/rekening/` picks a page through the query string, because there is no router here at all:

```
localhost:3005/rekening/              → the list
localhost:3005/rekening/?id=6abc…     → that account's detail
```

That page also **plays host** for one thing: it listens for `duidtin:navigate` and translates
the destination into `?id=`, exactly as the host translates it into `router.push`. Without
that, a link inside the remote would aim at `/rekening/<id>` — a path this dev server does
not have. One contract, two interpreters; see section 4.

> Without a session every section shows the error state "Belum login" without a single wasted request — `http` rejects them client-side. The session lives in `localStorage` on the `:3000` origin, not `:3005`.

## Where it stands

Verified in a browser through the host on `:3000`, console clean on both pages:

- **Two exposes** rendered by the host from two page files: `/rekening` → `./daftar`, `/rekening/[id]` → `./detail`.
- **The `id` travels from the host into the Vue app** through props. The detail page shows "Operasional · 1420-0100-2233 · Rp 842.150.000 · Dibuka 30 September 2026".
- **The four new assembled elements got their first consumer**: `<dtn-table>`, `<dtn-tabs>`, `<dtn-modal>` and `<dtn-data-state>`. The modal opens from an attribute, focus moves into the dialog, and Escape emits `dtn-close`.
- The currency filter works: 3 accounts → the **Valas** tab → 1 row → the **Rupiah** tab → 2 rows.
- API: one request to `/rekening` on the list page; `/rekening/:id` plus `/rekening/:id/aktivitas` on the detail page, both `200`.
- **Navigation with no reload**, from a Vue remote into the Next router: clicking a link on the list → `/rekening/6abc…` with a `window` marker still alive, heading "Operasional", balance "Rp 842.150.000". The **Back** button returns to the list, also without a reload, **and the Valas filter is still selected** — 1 row, not 3.
- All four paths of the event are proven: the host listens → `router.push`; the dev page listens → `?id=`; **nobody listens** → `location.assign` (a full reload, but it still arrives at the right page); and a cmd-click is left to the browser (`defaultPrevented: false`).

Not there yet:

- Activity pagination. `/rekening/:id/aktivitas` is hard-capped at 10 rows — the full list is the Mutasi feature's job.
- Any action at all. The whole repo is read-only.

## Four things that are new here

### 1. One repo, two pages — the host owns the routes

```
host    pages/rekening/index.tsx   → <RemoteMount remote="duidtin_feature_rekening/daftar" />
        pages/rekening/[id].tsx    → <RemoteMount remote="…/detail" props={{ id }} />
repo    exposes: { "./daftar": "./expose/daftar.ts", "./detail": "./expose/detail.ts" }
```

**File path = URL path = expose name**, kept in sync by hand. Adding a sub-page means editing two repos. That is the price, and it buys one valuable thing: **the Back button just works**, because only Next touches history. The alternative is putting `vue-router` inside the remote — one repo to edit, but two routers on one page both listening to `popstate`, and they must agree on who handles what.

A single registry entry on the host serves **both** routes, because the default `matchType` is `prefix`:

```ts
duidtin_feature_rekening: {
  entryPath: "/rekening/static/remoteEntry.js",
  routes: ["/rekening"],   // matches "/rekening" AND "/rekening/<id>"
}
```

### 2. Data from the host through props

The detail page needs an `id`, and the `id` is part of the URL — which the host owns.

```tsx
// host — pages/rekening/[id].tsx
const id = typeof router.query.id === "string" ? router.query.id : undefined;
if (!id) return null;                       // first render: router.query is still empty
return <RemoteMount remote="…/detail" props={{ id }} />;
```

```ts
// this repo — expose/create-mount.ts
app = createApp(Root, props);               // props become the Vue app's ROOT PROPS
```

```vue
<!-- containers/detail/index.vue -->
const { id } = defineProps<{ id: string }>();
```

**The remote never reads `location`.** If it did, it would have to know the host's route shape — and that shape can change without the remote knowing. With props the contract is explicit: the host owns the URL, the remote owns the content.

Two things to remember about these props:

- **Data only, never functions.** Functions cannot be serialised, and `RemoteMount` compares props as a string (`JSON.stringify`) to decide whether a remount is needed — function values drop out of that comparison without a sound. When the remote needs to tell the host something, the path is a `CustomEvent` from inside, not a callback from outside. That is what section 4 is about.
- **`if (!id) return null`** is not ceremony. On the first render `router.query` is still empty because Next has not hydrated; without the guard the remote mounts with `id: undefined`, calls the API, fails, and is torn down a second later.

### 3. State that survives a page change

Going from the list to the detail **unmounts** the list page's Vue app entirely, and coming back **mounts** a fresh one. Anything living inside that app is lost along the way.

```
/rekening        Vue app #1   filter = "IDR"
   ↓ click an account
/rekening/:id    Vue app #1 TORN DOWN, Vue app #2 mounted
   ↓ Back button
/rekening        Vue app #3 mounted — the filter?
```

That is why the currency filter lives in [`stores/account-filter.ts`](stores/account-filter.ts) rather than a component `ref`. The store is module-level, so its lifetime is **the bundle's**, not the app's — and the filter the user picked is still there when they come back.

This is the first time the feature-repo rule "state goes in Zustand" has a reason that can be demonstrated rather than merely asserted.

### 4. Navigation out, through a DOM event

Props carry data in. For the way out — "please go to this page" — props are unusable, and not
because of a rule but because of the mechanism: `RemoteMount` compares props with
`JSON.stringify`, and function values vanish from that comparison without a sound.

A React remote does not have this problem. The host simply passes its `router` object as a
prop, `push` and all — one React tree, so the function reference crosses intact. That is what
`qcash-ui-forex` (Next 16) does under `qcash-ui` (Next 14). For Vue that route is closed, so
the direction is reversed: **the host does not send a function in, the remote sends an intent out.**

```
remote                                   host
──────                                   ────
<Link to="/rekening/6abc…">
  plain left click
    → preventDefault() on the <a>
    → CustomEvent "duidtin:navigate"   ──▶  listener on the RemoteMount <div>
       { bubbles, cancelable }                → preventDefault()
                                              → router.push("/rekening/6abc…")
    ◀── dispatchEvent() === false ────────────┘
       "someone has got this" → done
```

What makes this safe to use anywhere: the event is **`cancelable`**, and `dispatchEvent`
returns `false` as soon as something cancels it. So the remote can tell whether anyone was
listening:

```ts
// utils/navigate.ts
if (from.dispatchEvent(event)) globalThis.location.assign(to);
```

That one line is three behaviours at once:

| Who listens | Result |
|---|---|
| The `duidtin-ui` host | `router.push` — a page change with no reload |
| The dev page on `:3005` | translated into `?id=` + `history.pushState` |
| **Nobody** | `location.assign` — a full reload, but it still arrives |

The last row is the important one: this repo stays correct opened on its own, and stays
correct under a host that has never heard of the event. It degrades, it does not break.

[`containers/shared/link.vue`](containers/shared/link.vue) still renders a real
`<a href>`, not a `<span onclick>`. JavaScript only takes over the **plain left click**;
middle-click, cmd/ctrl-click, "open in new tab", the browser's status bar, and what the link
means to a screen reader all stay with the browser:

```ts
if (event.defaultPrevented || event.button !== 0 ||
    event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
```

One thing still carried by hand: **the event name is duplicated** in this repo's
`utils/navigate.ts`, its copy in `duidtin-feature-beranda`, and the host's `remote-mount.tsx`. Same reason as "file path = URL path
= expose name" — these repos never `npm install` each other.

All code identifiers in this repo are English (`fetchAccounts`, `visibleAccounts`,
`useAccountFilter`). Two kinds of name deliberately stay as they are, because another repo
owns them: the API's JSON fields (`nama`, `saldo`, `mataUang` — mirrored from `duidtin-api`)
and the expose keys `./daftar` / `./detail` that the host loads. Renaming either means
changing the other repo in the same step.

## The stack

| | Choice | Note |
|---|---|---|
| Framework | Vue 3.5 | same as beranda |
| Bundler | Rsbuild 1.x | no Next: neither routing nor SSR is needed |
| MF plugin | `@module-federation/rsbuild-plugin` 0.24.1 | same as the design system |
| React | **not installed** | `<dtn-*>` runs it inside; the design system carries its own fallback |
| `vue` | **not shared** | see below |
| Data | `@tanstack/vue-query` 5 | a fresh `QueryClient` per mount |
| Session | `@duidtin/auth` + the `/vue` subpath | the very same store as the host |
| Styling | Tailwind v4, prefix `frek` | BEM + the `--dtn-*` tokens |
| Port / base | 3005 / `/rekening` | |

### Why `vue` is not shared

There are now **two** Vue remotes in this application, so the question is real: does it need to be a singleton like React?

```
react   singleton REQUIRED   two copies → "Invalid hook call" — a CORRECTNESS problem
vue     not shared           two copies → 89 kB extra — a SIZE problem
```

The answer differs from React's. Two Vue instances coexist without complaint; this is purely about bundle size. And what making it a singleton would cost: every Vue remote pinned to one compatible version — reducing exactly the remote independence this architecture is built on.

One thing makes the cost almost never materialise: **the host loads remotes per route**. Beranda at `/` and rekening at `/rekening` are never alive at the same time. Two copies of Vue only genuinely coexist if the layout itself goes Vue one day.

The decision: leave it, and measure again if that happens. The change is one line in `rsbuild.config.ts`.

## Folder layout

```
duidtin-feature-rekening/
  expose/
    create-mount.ts      the shared core: configureAuth + createApp + VueQueryPlugin
    daftar.ts            "./daftar"  — one line (file named after the expose key)
    detail.ts            "./detail"  — one line, takes { id }
  entry/
    dev.ts · dev-app.ts  the dev page: picks a page via ?id=, and stands in for the
                         host as the duidtin:navigate listener
  containers/
    list/index.vue       summary + table + filter
    detail/index.vue     detail + activity + modal
    shared/              error-boundary.vue · error-banner.vue · format.ts
                         link.vue — an <a href> that throws duidtin:navigate
  composables/
    use-account-list.ts · use-account-detail.ts
  stores/
    account-filter.ts    RULE 2 — and here the reason can be demonstrated
    error-global.ts
  services/
    federation.ts        registers the design system + loads the <dtn-*> wrappers
    query-client.ts
    api/client.ts        apiGet(endpoint, path) — see below
    api/account.ts · api/types.ts
  utils/
    navigate.ts          the duidtin:navigate contract + the location.assign fallback
    index.ts · zustand-vue.ts
  types/ · styles/ · constants/
```

`apiGet` here takes **two** arguments, unlike beranda's one. Beranda can name just the block because its endpoints are flat (`/beranda/<name>`); here they are nested (`/rekening/:id/aktivitas`), so the full path is passed separately from the short name used by `?gagal=`, `?kosong=` and the error messages.

## Assembled elements: the first consumer

This repo is the first to use the design system's assembled elements. Two of their limits showed up immediately and are accounted for:

**`<dtn-table>` cell content is text only.** One element has one child slot, while a table needs one slot per cell. So numbers are formatted **before** they reach the table:

```ts
const rows = computed(() => visibleAccounts.value.map((account) => ({
  id: account.id, nama: account.nama, nomor: account.nomor, mataUang: account.mataUang,
  saldo: formatCurrency(account.saldo, account.mataUang),   // "Rp 842.150.000", not 842150000
})));
```

The consequence: the balance column cannot carry a badge or per-value colouring. If that is needed, the way out is a plain `<table>` with the design-system CSS classes — not forcing the element to become flexible.

**Complex data goes through PROPERTIES, not attributes.** `:columns="columns"` passes an array. An HTML attribute can only hold text, so a framework forced to use one calls `String(array)` and produces `"[object Object]"`. The design-system wrapper exposes a DOM property for every prop, and Vue uses it automatically once the property exists. This was found while building this very repo — the table and the tabs rendered empty until the wrapper was fixed.

## Deploy

Its own Vercel project, **Root Directory** `duidtin-feature-rekening`. Every build setting lives in `vercel.json` (`framework: null`, `buildCommand`, `outputDirectory`, `ignoreCommand`), so nothing needs clicking except one env var:

| Env | Value | If empty |
|---|---|---|
| `PUBLIC_API_URL` | the production API URL | falls back to `http://localhost:4000` — hitting the visitor's own laptop |

And on the **host** project, `REMOTE_REKENING_URL` must hold this project's URL. Its rewrite covers **assets only**:

```js
source: "/rekening/static/:path*"
```

Not `/rekening/:path*` as beranda has — because `/rekening` and `/rekening/[id]` are **host routes**, not remote assets. The two never collide, because remote assets always sit under `/rekening/static/*` while the pages never have a `static` segment.

Both the env value and the rewrite are baked at build time, so setting them must be followed by a **redeploy**.

## Next steps

- Activity pagination, or hand it to the Mutasi feature, which is meant for exactly that.
- Lift `utils/navigate.ts` into a shared package once a third remote needs it — the event name is copied by hand here, in beranda, and in the host's `remote-mount.tsx` today.
- Measure the cost of two Vue copies once some page loads two Vue remotes at once.
