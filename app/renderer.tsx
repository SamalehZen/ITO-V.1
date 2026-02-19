import './sentry'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app'
import { flushAllPendingSyncs } from '@/app/utils/debouncedStoreSync'

import '@/app/styles/app.css'

window.addEventListener('beforeunload', () => {
  flushAllPendingSyncs()
})

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
