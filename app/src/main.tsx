import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/AuthContext'
import { ClubProvider } from './lib/ClubContext'
import { initNativeShell } from './lib/native'

void initNativeShell()

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <AuthProvider>
      <ClubProvider>
        <App />
      </ClubProvider>
    </AuthProvider>
  </HashRouter>,
)
