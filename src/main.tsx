import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/great-vibes/400.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import './index.css'
import App from './App.tsx'
import { initScreenScaler } from './utils/screenScaler'
import { initializeSyncCache } from './platform/syncCache'

initScreenScaler()

async function startApp() {
  try {
    await initializeSyncCache()
  } catch (error) {
    console.error('Native SQLite cache could not be opened:', error)
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void startApp()
