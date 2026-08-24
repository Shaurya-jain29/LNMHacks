'use client'

import { useSyncExternalStore, useEffect, useState } from 'react'
import { subscribeLenisScroll, getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { subscribePointer, getPointerSnapshot, initPointerBus } from '@/lib/pointer-bus'

const SERVER_SCROLL = { scrollTop: 0, limit: 0, progress: 0, velocity: 0, direction: 0 as const, viewportHeight: 0 }
const SERVER_POINTER = { x: 0.5, y: 0.5, inside: false }

export function DebugHud() {
  // Initialize pointer bus once on mount
  useEffect(() => {
    return initPointerBus()
  }, [])

  // In order to avoid hydration mismatch, we only render the store data after mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const scroll = useSyncExternalStore(subscribeLenisScroll, getLenisScrollSnapshot, () => SERVER_SCROLL)
  const pointer = useSyncExternalStore(subscribePointer, getPointerSnapshot, () => SERVER_POINTER)

  if (!mounted) return null

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-4 font-mono text-xs z-50 rounded backdrop-blur border border-white/10 flex flex-col gap-2 min-w-[200px]">
      <div className="font-bold text-white/50 border-b border-white/10 pb-1 mb-1">DEV HUD</div>
      
      <div>
        <div className="text-white/50">SCROLL</div>
        <div>Progress: {scroll.progress.toFixed(4)}</div>
        <div>Top: {Math.round(scroll.scrollTop)}px</div>
        <div>Velocity: {Math.round(scroll.velocity)}</div>
      </div>
      
      <div>
        <div className="text-white/50 mt-2">POINTER (UV)</div>
        <div>X: {pointer.x.toFixed(4)}</div>
        <div>Y: {pointer.y.toFixed(4)}</div>
        <div>Inside: {pointer.inside ? 'true' : 'false'}</div>
      </div>
    </div>
  )
}
