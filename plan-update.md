# Dublin Lions BC — Massive Feature Update Plan

## New Features

### 1. Team Roster Management (Add/Remove Players)
- TeamsView: Add "Manage Roster" button per team
- Modal: Check/uncheck players to add/remove from team
- Players can be on multiple teams
- Live sync

### 2. Team Group Chat
- New "Chat" tab in sidebar
- Each team has its own chat room
- Real-time messaging using localStorage + BroadcastChannel (for same-device tabs)
- Snappy — no polling, instant via storage events
- Show team name, sender name, timestamp

### 3. Coach Permissions
- New `role` field: 'manager' | 'coach' | 'player'
- Coaches can manage their team's roster
- Coaches can edit their team's schedule
- Coaches can send team announcements

### 4. Team-Specific Schedule
- Sessions have `teamId` — each team sees only their sessions
- Coach can add/edit sessions for their team only
- Manager can add/edit all team sessions
- Filter schedule by team

### 5. Player Dashboard — All Live Data
- Remove all hardcoded mock data
- Everything reads from localStorage (players, teams, sessions, payments, announcements, chat)
- Real-time sync across tabs

### 6. Home Page — Editable Players
- Manager can click player names to edit
- Manager can click player photos to upload new images
- All changes saved to localStorage

### 7. Fix Mobile Issue (pending description)

## Execution
- One massive sub-agent to rebuild both ManagerDashboard AND PlayerDashboard
- Update clubData.ts with new types (ChatMessage, UserRole, etc.)
- Update App.tsx with new routes if needed

## Files to Modify
- src/lib/clubData.ts — Add chat types, role types
- src/pages/ManagerDashboard.tsx — Add chat view, team roster management, coach permissions, team schedule
- src/pages/PlayerDashboard.tsx — All live data, team chat, team schedule
- src/pages/Home.tsx — Editable player names/images
- src/App.tsx — Chat routes if needed
- src/index.css — Chat styling, dark dropdowns
