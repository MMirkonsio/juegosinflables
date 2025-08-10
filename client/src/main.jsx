import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { Toaster } from 'sonner'


createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster richColors position="top-right" />
  </BrowserRouter>
)
