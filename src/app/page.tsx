'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { DebugHud } from '@/components/dom/debug-hud'
import { useRef, Suspense } from 'react'
import * as THREE from 'three'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { getPointerUV } from '@/lib/pointer-bus'
import { ProjectMeshes } from '@/components/canvas/grid/project-meshes'
import { ProjectGrid } from '@/components/dom/project-grid'
import { GlassCenterpiece } from '@/components/canvas/glass/glass-centerpiece'
import { ScrambleText } from '@/components/dom/scramble-text'
import { FluidBackground } from '@/components/canvas/fluid-background'
import { LensFlarePass } from '@/components/canvas/postfx/lens-flare-pass'

import { Environment } from '@react-three/drei'

// A simple background scene to verify R3F is running smoothly alongside DOM.
function DebugScene() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!meshRef.current) return

    // Read from buses without re-rendering the component!
    const scroll = getLenisScrollSnapshot()
    const pointer = getPointerUV()

    // Rotate cube based on scroll progress and pointer position
    meshRef.current.rotation.y = scroll.progress * Math.PI * 4 + pointer.x * Math.PI
    meshRef.current.rotation.x = pointer.y * Math.PI

    // Move the cube up and down slightly with scroll
    meshRef.current.position.y = Math.sin(scroll.progress * Math.PI * 2) * 2
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshNormalMaterial wireframe />
    </mesh>
  )
}

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* 3D Canvas Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <Suspense fallback={null}>
            <FluidBackground />
            <GlassCenterpiece />
            <ProjectMeshes />
          </Suspense>
        </Canvas>
      </div>

      {/* Spacer to push ProjectGrid down by one full viewport height */}
      <div className="h-screen w-full pointer-events-none" />

      {/* Debug HUD */}
      <DebugHud />



      <ProjectGrid />
    </main>
  )
}
