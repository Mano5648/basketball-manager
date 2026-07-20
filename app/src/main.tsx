import 'lenis/dist/lenis.css'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/AuthContext'
import { initAppStateSync, pruneDemoSeedData } from './lib/clubData'

// Pulls shared data (players, teams, fixtures, Team Chat, etc.) from Supabase
// and keeps it live-synced across devices/browsers. No-ops if Supabase env
// vars aren't configured — the app keeps working from localStorage alone.
// Demo-roster cleanup runs only AFTER the remote pull finishes, so a fresh
// device never prunes its (possibly stale/default) local data ahead of
// picking up what's already been synced from elsewhere.
initAppStateSync().then(() => pruneDemoSeedData())

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </HashRouter>,
)
