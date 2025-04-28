import React from 'react'
import ReactDOM from 'react-dom/client'

const root = document.createElement('div')
root.id = 'crx-root'
root.style.zIndex = '2147483640'
root.style.position = 'fixed'
root.style.inset = '0'
root.style.pointerEvents = 'none'
document.body.appendChild(root)

ReactDOM.createRoot(root).render(
  <React.StrictMode>{/* TODO: content */}.</React.StrictMode>,
)
