# Agent Handoff — Dublin Lions Basketball Club Portal

> Read this first. Everything you need to be productive in the next 60 seconds.

## 1. What this project is

A single-page web app for **Dublin Lions Basketball Club** with two portals:

- **Manager Portal** (`/#/manager/login` → `/#/manager/dashboard`) — full club ops:
  roster, teams, sessions, fixtures, payments, announcements, images, season lifecycle.
- **Player / Parent Portal** (`/#/player/login` → `/#/player/dashboard`) — sign-in, sign-up,
  child registration, fees, fixtures, team chat, notifications.

Marketing shell (Home, Teams, Fixtures, Store, Contact, Privacy) lives at
`/#/…` too — this is a **HashRouter** app (important — see §4).

## 2. Stack

| Layer      | Choice                                                                 |
|------------|-------------------------------------------------------------------------|
| Framework  | **Vite 7** + **React 19** + **TypeScript** (no CRA, no Next)            |
| Router     | `react-router-dom` v7, **HashRouter** (routes are `#/…`)                |
| Styling    | Tailwind + a lot of custom CSS in `src/index.css`                       |
| Motion     | `motion/react` (Framer Motion successor) + custom presets               |
| Auth       | **Supabase Auth** (`@supabase/supabase-js`)                             |
| Data       | **localStorage is the source of truth**, mirrored to Supabase `app_state` (key/value + realtime) so devices stay in sync. See §6. |
| Payments   | Stripe Checkout (`src/lib/stripeCheckout.ts`)                           |
| Hosting    | GitHub Pages, served from **`/app/docs`** (built output committed)      |
| Dev server | `yarn dev` on port 3000 from **`/app/app`** (not `/app`)                |

> ⚠️ The Emergent boilerplate paths (`/app/backend`, `/app/frontend`) **do not exist**
> here. The whole app is in `/app/app`. Supervisor's default programs fail — ignore them.
> Start the dev server manually: `cd /app/app && yarn install --ignore-engines && yarn dev`.
> Node engine warning on `@supabase/supabase-js` is expected — use `--ignore-engines`.

## 3. File map (only what matters)

```
/app/app/
├── .env.example               VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MANAGER_EMAILS
├── .env.local                 (gitignored — copy from .env.example on a fresh clone)
├── src/
│   ├── App.tsx                Routes; wraps everything in <AuthProvider> + <ErrorBoundary>
│   ├── lib/
│   │   ├── AuthContext.tsx    Auth state, sign-in / sign-up / sign-out. See §5.
│   │   ├── supabase.ts        Supabase client + isManagerEmail() (allowlist)
│   │   ├── clubData.ts        ~2.6k LOC. Data model, getStore/setStore, remote sync,
│   │   │                      merge logic, roster reconciliation. Central nervous system.
│   │   ├── security.ts        Client-side rate limits
│   │   └── stripeCheckout.ts  Stripe redirect flow
│   ├── pages/
│   │   ├── Home.tsx           Landing (uses ClubVideoBackground)
│   │   ├── ManagerLogin.tsx   Manager sign-in
│   │   ├── ManagerDashboard.tsx  ~4.8k LOC — everything the manager does
│   │   ├── PlayerLogin.tsx    Sign-in + Register (tabbed)
│   │   ├── PlayerDashboard.tsx   ~2.2k LOC — player/parent hub, child registration
│   │   └── (Teams, Fixtures, Store, Contact, Privacy, PaymentSuccess, ResetPassword)
│   ├── components/
│   │   ├── ClubVideoBackground.tsx   Video hero used by Home + login layout
│   │   ├── dashboard/PortalLoginLayout.tsx   Shared frame for both logins + register
│   │   ├── ErrorBoundary.tsx  Wraps routes; added after MembersView crash
│   │   └── (Navbar, Footer, ProtectedRoute, PaymentCheckout, ui/*)
│   └── hooks/useSiteImages.ts Manager-editable images + text labels (label: prefix)
├── supabase/
│   ├── app-data-setup.sql     Creates public.app_state, RLS (auth INSERT/UPDATE,
│   │                          manager-only DELETE), realtime publication. RUN THIS ONCE.
│   └── security-hardening.sql Optional manager-only READ policy on dlbc_players — NOT
│                              applied to live DB yet (see §7).
└── docs/                      Built output committed for GitHub Pages
/app/memory/
├── PRD.md                     Running changelog + open items (append to this)
├── test_credentials.md        Manager + parent accounts for testing
└── AGENT_HANDOFF.md           You are here
/app/test_reports/             Testing-agent output, `iteration_{n}.json`
```

## 4. Routing gotchas (HashRouter)

- Every URL is `https://…/#/manager/dashboard` — the `#` is required.
- `redirectTo` for password reset must include the hash — see `getPasswordResetRedirectUrl()`
  in `src/lib/imageUrl.ts`.
- On GitHub Pages the site is served under a subpath (`/basketball-manager/`), so the
  `asset()` helper in `useSiteImages.ts` is what makes bundled `public/` assets work in
  both dev (`/`) and prod (`/basketball-manager/`).

## 5. Auth — read this before touching anything auth-related

- **Supabase Auth**, email + password. `signUp` creates a Supabase user + upserts a row in
  the `dlbc_players` roster via `upsertPlayerFromAuth`.
- **Manager access is controlled by `VITE_MANAGER_EMAILS`** (comma-separated allowlist),
  NOT by `user_metadata.role`. Never trust `user_metadata.role` on the client — the SQL
  function `is_manager()` also enforces this server-side.
- `AuthContext` mirrors the Supabase user into `localStorage['dlbc_user']` and dispatches
  a `dlbc-auth-change` event so Navbar/dashboards can read auth state synchronously.
- **DO NOT** re-add "log the user out on any getUser() error" — that caused random
  logouts. Only sign out on definitive auth errors (see the `isDefinitiveAuthError`
  helper in `AuthContext.tsx`). Network / 5xx / thrown fetch → keep the session.
- The `validate()` effect is debounced (1.5 s) and only re-triggers on the two
  storage keys that actually matter: `dlbc_players`, `dlbc_revoked_member_emails`.
- **Any auth work MUST route through `integration_playbook_expert_v2`** — per the
  house rules, do not hand-roll auth code even for "small" changes.

Test accounts (`/app/memory/test_credentials.md`):

- Manager: `manager@dublinlions.ie` / `lions2025`  (→ `/#/manager/login`)
- Parent:  `cooler74.ea@gmail.com`  / `test12`     (→ `/#/player/login`)

## 6. Data layer — the mental model

This is the single thing to internalise:

> **localStorage is the source of truth. Supabase `app_state` is a shared mirror.**

- Read: `getStore(key, fallback)` synchronously reads/parses localStorage — instant, no
  awaits. `getPlayers()`, `getTeams()`, `getSessions()` etc. are thin wrappers.
- Write: `setStore(key, value)` writes locally, dispatches a same-window `storage` event
  (so listeners across the app react), and fires-and-forgets an upsert to
  `public.app_state` (Supabase). All UI writes go through this.
- Sync: on load, `pullRemoteAppState()` pulls every row and merges remote-over-local.
  A realtime subscription re-dispatches storage events for live updates.
- Members can only publish their own contributions to a private
  `dlbc_roster_contrib:<uid>` row; managers aggregate them into `dlbc_players`. This
  avoids cross-member clobbering and is the reason parent-registered kids show up on
  the manager. See `mergeContributionIntoPlayers` in `clubData.ts`.
- **`refresh()` in `ManagerDashboard.tsx` `useLiveData` runs every 3 s + on storage
  events.** It now JSON-diffs each slice and skips `setState` when unchanged — so a
  full re-render of the 4.8k-line manager tree only happens when data actually changed.
  Do not remove that guard.
- Deletes require `childrenUpdatedAt` LAST-WRITE-WINS semantics. Straight
  "largest-set-wins" merges resurrected deleted children on reload. See §3 of PRD.md.

## 7. Known open items (P0 → P2)

Read `/app/memory/PRD.md` for the full running list. Highlights:

- **P1 — live GitHub Pages build is stale.** All Jan 2026 fixes (random logout,
  ManagerDashboard stutter, login-refresh image flash, dark "OR" chip) are on
  `main` in `/app/app/src` but `/app/docs` still has the previous build. The user
  will trigger a redeploy via **Save to GitHub** — see §9.
- **P1 — `security-hardening.sql` not applied.** Any authenticated member can read
  `dlbc_players` (PII exposure). Client uses the `dlbc_roster_contrib:*` mechanism
  so members don't strictly need read on `dlbc_players`; consider applying the
  policy but test the member-side thoroughly first.
- **P2 — refactor.** `PlayerDashboard.tsx` (~2.2k) and `clubData.ts` (~2.6k) are
  over the file-size guideline. Split `ProfileTab` and the sync layer respectively.

## 8. Recurring pitfalls (don't repeat these)

1. **`getPlayers()` returns a fresh array every call** (it's `JSON.parse` from
   localStorage). Passing it into `setState` unconditionally breaks memos and causes
   visible stutter. Diff before setting.
2. **`setStore` dispatches a same-window `storage` event.** Any code listening to
   `storage` will fire on every write — do not run network calls or heavy work
   without debouncing (see AuthContext's `scheduleValidate`).
3. **Video posters flash on refresh.** `ClubVideoBackground` used to render a
   fallback `<img>` and set the native `<video poster=…>` attribute — both painted
   the poster before the video buffered. Now the poster only renders when video is
   intentionally disabled (reduced-motion / image mode). Keep it that way.
4. **`#151f30` chips on the white portal card look like dark blobs.** The card is
   `rgba(255,255,255,0.97)` — dividers/chips inside the card must use `bg-white`
   and slate-200 hairlines, not the dark-theme colours used elsewhere.
5. **Never modify supervisor programs** — the app is fine as `yarn dev`. Backend
   / frontend supervisor entries fail because there's no `/app/backend` or
   `/app/frontend`; ignore them.
6. **HashRouter + GitHub Pages subpath**: always route through `asset()` for
   `public/` files; never hardcode `/foo.png`.
7. **DB deletes need `childrenUpdatedAt` bumps.** The merger uses last-write-wins
   on that timestamp. Skipping it will resurrect deleted kids on the next sync.

## 9. Deploying / pushing to GitHub

**The main agent does NOT push code.** Direct the user to the **"Save to GitHub"**
button in the Emergent chat input — that's the sanctioned flow. See the platform
support agent if unsure. To ship the fixes to the live site:

1. User clicks **Save to GitHub** → pushes `main`.
2. Rebuild `/app/docs`: `cd /app/app && yarn build` (Vite is configured to output to
   `../docs` via `vite.config.ts`), then commit and push again.
3. GitHub Pages redeploys automatically from `docs/` on `main`.

## 10. How to work on this project

1. `cd /app/app && yarn install --ignore-engines` (once).
2. `cd /app/app && yarn dev` — port 3000.
3. `cd /app/app && npx tsc -b` before you claim a fix compiles. **This project has
   NO backend, so `curl` health checks won't apply.** Use `tsc -b`, ESLint, and
   Playwright screenshots via the screenshot tool.
4. Test via `testing_agent_v3` for anything non-trivial (see `/app/test_reports/`
   for the iteration history — read the latest one first).
5. Append your changes to `/app/memory/PRD.md` under a new dated section. Update
   `test_credentials.md` if you touch accounts.
