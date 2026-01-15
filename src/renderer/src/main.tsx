import './assets/main.scss'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

import './monaco-workers'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
