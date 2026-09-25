import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// HashRouter (not BrowserRouter) on purpose: this gets deployed as a
// static build (e.g. GitHub Pages / any plain file host) with no
// server-side routing configured, so hash-based routes ("#/breakout")
// always resolve without extra server config.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
