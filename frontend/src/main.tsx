import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/caveat/wght.css'
import '@fontsource-variable/nunito-sans/wght.css'
import '@fontsource-variable/nunito-sans/wght-italic.css'
import './styles/global.css'
import App from './app/App'
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
