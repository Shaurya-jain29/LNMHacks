'use client'

import { ReactLenis, useLenis } from 'lenis/react'
import { addEffect } from '@react-three/fiber'
import { useEffect } from 'react'
import { bindLenisScrollBus } from '@/lib/scroll-bus'
import { initPointerBus } from '@/lib/pointer-bus'

export function ScrollShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    return initPointerBus()
  }, [])

  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1, smoothWheel: true }}>
      <LenisScrollEnvBridge />
      {children}
    </ReactLenis>
  )
}

function LenisScrollEnvBridge() {
  const lenis = useLenis()

  useEffect(() => {
    bindLenisScrollBus(lenis ?? null)
    return () => bindLenisScrollBus(null)
  }, [lenis])

  useEffect(() => {
    if (!lenis) return
    // Runs inside R3F's render loop, before any consumer useFrame.
    return addEffect((time: number) => {
      lenis.raf(time)
    })
  }, [lenis])

  return null
}
