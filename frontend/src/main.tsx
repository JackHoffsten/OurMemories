import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { content } from './config/content'

document.title = content.site.title
document
  .querySelector('meta[name="description"]')
  ?.setAttribute('content', content.site.description)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
