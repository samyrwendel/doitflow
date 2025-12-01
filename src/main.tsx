import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Detectar e aplicar tema escuro automaticamente
function applyTheme() {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (isDarkMode) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// Aplicar tema inicial
applyTheme()

// Escutar mudanças de tema do sistema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)