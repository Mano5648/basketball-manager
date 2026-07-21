# Dublin Lions Basketball Club — Manager/Member Portal

Vite + React + TS SPA (in /app/app), Supabase for auth + shared state, localStorage
as the synchronous source of truth mirrored to Supabase `app_state` (key/value blobs).
Deployed to GitHub Pages from /app/docs.

## Bug fixed (Jun 2026): Parent-registered children not visible on manager side
Root cause: RLS on `app_state` (supabase/app-data-setup.sql) allowed only managers to
INSERT/UPDATE. A parent (non-manager authenticated user) registering a child triggers
`setPlayers -> syncKeyToRemote -> app_state.upsert('dlbc_players', ...)`, which RLS
silently rejected (client only console.warn'd). The child never reached Supabase, so the
manager never saw it. The same policy also silently broke member Team Chat + member card
payment sync.

Fix:
1. supabase/app-data-setup.sql: INSERT/UPDATE now `to authenticated with check (true)`
   (DELETE stays manager-only). PII reads remain manager-only. Client merges local+remote
   (mergePlayersForSync) so concurrent writers converge.
   ==> IMMEDIATE FIX: re-run this SQL in Supabase; works with the ALREADY-DEPLOYED client.
2. clubData.ts: extracted `pullRemoteAppState()`; ManagerDashboard `useLiveData` now
   re-pulls shared state every 12s (fallback for when Supabase Realtime isn't delivering).
   Requires a client rebuild/redeploy of /app/docs to take effect.

## Known caveat / backlog
- Shared-blob writes: a member push of `dlbc_players` overwrites the whole blob with only
  their locally-known rows (members can't read others' PII). Union-merge on the manager
  (realtime + 12s re-pull + re-push) restores the full roster whenever a manager is
  connected. Rare edge case: two members registering while NO manager is connected can
  transiently clobber each other in Supabase. Hardening follow-up (P1): per-member
  submission keys (`dlbc_roster_contrib:<uid>`) that members own and managers aggregate.

## Next action items
- P0: User re-runs supabase/app-data-setup.sql in their Supabase project.
- P1: Rebuild + redeploy /app/docs so the 12s manager re-pull ships.
- P2: Per-member submission keys to eliminate cross-member clobbering.
