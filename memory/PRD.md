# Dublin Lions Basketball Club — Manager/Member Portal

Vite + React + TS SPA in `/app/app`. Supabase for auth + shared state; localStorage is the
synchronous source of truth, mirrored to a Supabase `app_state` key/value table. Deployed to
GitHub Pages from `/app/docs`. Runs in preview via supervisor program `app_vite` (port 3000);
env in `/app/app/.env.local`.

## Bugs fixed (Jun 2026)

### 1. Parent-registered children not visible to manager (+ delete not working)
- RLS on `app_state` allowed only managers to write → parent child registrations were silently
  rejected (RLS 403). Fixed in `supabase/app-data-setup.sql`: authenticated members can
  INSERT/UPDATE (DELETE stays manager-only). USER RAN THIS SQL on the live project.
- P2 hardening: members publish only their own rows to a private `dlbc_roster_contrib:<uid>`
  row; managers aggregate. No cross-member clobbering.
- ChildDobPicker bug (`BirthDateFields.tsx`): `onChange` was called inside the `setState`
  updater, dropping the DOB → new child silently discarded. Fixed.
- Delete durability (multiple root causes, all fixed in `clubData.ts`):
  - `childrenUpdatedAt` timestamp on the parent row; LAST-WRITE-WINS everywhere
    (`mergePlayersForSync`, `syncRegisteredChildrenFromAuthMetadata`, `mergeContributionIntoPlayers`)
    instead of the old "largest children set wins" (which resurrected deleted kids on reload —
    note the parent CAN read `dlbc_players` in this DB, so it pulls+merges on reload).
  - `stripOrphanChildRosterRows()` applied after every merge → removes `child-*` roster rows
    whose parent no longer lists them (fixes orphan child lingering on the manager).
  - Debounced member contribution push + 4x retry on transient "Failed to fetch"; retrying
    `updateAuthUserData()` for auth metadata.
- VERIFIED end-to-end (iteration_7, 100%): add / delete-just-added / delete-pre-existing /
  re-add all persist on the parent AND propagate to the manager Members list.

### 2. Static notifications → real data (`PlayerDashboard.tsx`)
- Removed hardcoded `getMockNotifications` + hardcoded OverviewTab "Club news".
- `buildPlayerNotifications(clubPlayer)` derives from: outstanding fee, next upcoming session,
  and manager announcements (`getAnnouncements` status 'Sent'). Read/delete state persisted in
  `dlbc_player_notif_read` / `dlbc_player_notif_deleted`. Empty state added. VERIFIED.

### 3. Manager Members page went blank/white
- Cause: a malformed leftover 'probe' roster row (email=null, no teamIds) crashed
  `MembersView`'s search filter (`p.email.toLowerCase()`); no error boundary → whole app white.
- Fixes: cleaned bad data; null-safe MembersView filter+render; `stripOrphanChildRosterRows`
  drops child rows whose parent is absent (both merge paths); NEW `ErrorBoundary`
  (`src/components/ErrorBoundary.tsx`) wraps routes in `App.tsx`.
- VERIFIED (iteration_8, 100%): Members renders (amu, john), survives search/filters/navigation;
  error boundary never triggered.


### 4. Random logouts + screen stutter while executing tasks (Jan 2026)
- **Logout root cause** (`AuthContext.tsx`): `validate()` ran every 20s AND on every
  same-window storage event (including `e.key === null`, and `dlbc_players` /
  `dlbc_revoked_member_emails` writes fired synthetically by `setStore`). It called
  `supabase.auth.getUser()` (a network call) and — critically — signed the user out
  on ANY error, including transient network hiccups / 5xx / offline blips. Every
  task the user executed touched localStorage via `setStore`, which dispatched a
  storage event, which triggered a network validate, which occasionally errored →
  instant, seemingly random logout.
- **Fix**: `validate()` now only force-signs-out on definitive auth errors
  (`AuthSessionMissingError`, 401/403, invalid JWT/token, "user not found"). All
  other errors (network, 5xx, thrown fetch) leave the session intact. The storage
  handler is debounced (1.5s) and no longer reacts to `e.key === null`. Periodic
  revalidation moved 20s → 60s to reduce network chatter.
- **Stutter root cause** (`ManagerDashboard.tsx` `useLiveData.refresh`): fired every
  3s + every storage event, and unconditionally replaced 11 state slices with brand-new
  array/object references from `JSON.parse` (via `getStore`). Every task cascaded a full
  re-render through a 4,788-line component tree.
- **Fix**: `refresh()` now `JSON.stringify`-compares each slice against previous
  state and skips the setState if unchanged, so unchanged intervals no longer
  bust downstream memos.
- Verified with `tsc -b` (clean build); behavioural verification pending user test.

### 5. Image flash on Sign In / Register / Manager Login refresh (Jan 2026)
- **Cause**: `PortalLoginLayout` rendered `ClubVideoBackground`, which shows the poster
  image (`about-team-huddle.jpg`) as a fallback until the hero video loads (and again
  whenever `prefers-reduced-motion` is set). On refresh, the poster flashed visibly
  behind the login card before the video swapped in.
- **Fix**: `PortalLoginLayout.tsx` now uses a purely CSS backdrop — a two-tone dark
  navy gradient with soft blue/warn radial glows and a lightweight SVG grain overlay.
  No `<img>`, no `<video>`, no network fetch → zero flash on refresh. Applies to
  Sign In, Register (same layout), and Manager Login.
- Verified via screenshot at both `/#/manager/login` and `/#/player/login`.

## Open / Next action items
- P0 (OPEN, needs user input): "two login panels" report is ambiguous — could not reproduce a
  duplication on desktop (standard split-screen brand + form). Awaiting a user screenshot.
- P1: In this live DB, `dlbc_players` is readable by ANY authenticated member (member PII —
  names, guardian phone, DOB — exposed). The intended `security-hardening.sql` manager-only
  read policy is NOT applied. Consider applying it (but note the client currently relies on
  members reading `dlbc_players`; the contrib mechanism means members don't strictly need it —
  worth a follow-up to lock reads down without breaking sync).
- P1: Rebuild + redeploy `/app/docs` so all these client fixes ship to the live GitHub Pages site.
- P2: `PlayerDashboard.tsx` (~2200 lines) and `clubData.ts` (~2500 lines) exceed guidelines —
  split ProfileTab and the sync layer for maintainability.
