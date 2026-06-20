import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from './app/canvas/Canvas.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Canvas />
  </StrictMode>,
)
