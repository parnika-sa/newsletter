import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Admin from './Admin.jsx'
import Verify from './Verify.jsx'
import Unsubscribe from './Unsubscribe.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/verify/:token" element={<Verify />} />
        <Route path="/unsubscribe/:token" element={<Unsubscribe />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
