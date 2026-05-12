# Plan: Add Manager Edit/Remove to Teams Page

## Objective
Add manager-only player editing (image, stats) and removal to the public Teams page.

## Changes Required

### 1. `src/lib/clubData.ts` — Add optional fields
- Add `photoUrl?: string`, `ppg?: number`, `rpg?: number`, `apg?: number`, `height?: string`, `age?: number` to Player interface
- Update seed data with these fields for senior players

### 2. `src/pages/Teams.tsx` — Major rewrite
- Import `getPlayers`, `setPlayers`, `getTeams`, `setTeams`, `Player` from `clubData.ts`
- Add `isManager` state (check `localStorage.getItem('dlbc_user')` for role === 'manager')
- Add edit modal with photo upload (FileReader → base64)
- Add remove confirmation flow
- Add edit/remove buttons on player cards (manager-only, hover-appear)
- Connect to live `dlbc_players` data for men's/women's teams
- Keep existing visual design

### 3. Build & Deploy
- Setup worktree, build, copy dist, deploy
