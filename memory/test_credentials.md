# Test Credentials — Dublin Lions club app (Supabase-backed)

Supabase project: https://neulcrpkroiyglgiywcp.supabase.co
Env is wired in `/app/app/.env.local` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MANAGER_EMAILS).
App runs via supervisor program `app_vite` (Vite dev server) on port 3000.

## Accounts
- Manager: manager@dublinlions.ie / lions2025  (login at /#/manager/login)
- Parent/member: cooler74.ea@gmail.com / test12  (login at /#/player/login)
  - Currently has 2 registered children: amu, john

## Notes
- HashRouter app. Player login /#/player/login, Manager login /#/manager/login.
- Manager email(s) are controlled by VITE_MANAGER_EMAILS and the `is_manager()` SQL function.
