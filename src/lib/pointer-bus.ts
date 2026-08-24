import * as THREE from 'three'

type PointerSnapshot = { x: number; y: number; inside: boolean }

const uv = new THREE.Vector2(0.5, 0.5)
let insideFlag = false
let snapshotRef: PointerSnapshot = { x: 0.5, y: 0.5, inside: false }
const listeners = new Set<() => void>()
let rafScheduled = false

const scheduleNotify = () => {
  if (rafScheduled) return
  rafScheduled = true
  requestAnimationFrame(() => {
    rafScheduled = false
    for (const l of listeners) l()
  })
}

const updatePointer = (next: PointerSnapshot) => {
  snapshotRef = next
  uv.set(next.x, next.y)
  insideFlag = next.inside
  scheduleNotify()
}

function toUV(clientX: number, clientY: number): { x: number; y: number } {
  return {
    x: clientX / window.innerWidth,
    y: 1 - clientY / window.innerHeight, // flip to bottom-left origin for shaders
  }
}

export function initPointerBus() {
  const onMove = (e: PointerEvent) => {
    const { x, y } = toUV(e.clientX, e.clientY)
    updatePointer({ x, y, inside: true })
  }
  const reset = () => updatePointer({ x: 0.5, y: 0.5, inside: false })

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerleave', reset)
  window.addEventListener('blur', reset)
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset() })

  return () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerleave', reset)
    window.removeEventListener('blur', reset)
  }
}

export const getPointerUV = () => uv          // mutable Vector2 — safe to read raw in WebGL
export const isPointerInside = () => insideFlag
export const getPointerSnapshot = () => snapshotRef
export const subscribePointer = (l: () => void) => { listeners.add(l); return () => listeners.delete(l) }
