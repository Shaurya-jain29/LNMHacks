'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { getPointerUV } from '@/lib/pointer-bus'

interface StickerItem {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  textureIndex: number
}

const STICKER_PATHS = [
  '/item1.png',
  '/item2.png',
  '/item3.png',
  '/item4.png',
  '/item5.png',
  '/item6.png',
  '/item7.png',
  '/item8.png',
  '/item9.png',
  '/item10.png',
  '/item11.png',
  '/item12.png',
  '/item13.png',
  '/item14.png',
]

function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
}

export function FallingStickers() {
  const textures = useTexture(STICKER_PATHS)
  const { size } = useThree()

  // Configure textures for crisp transparent rendering
  useMemo(() => {
    textures.forEach((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.generateMipmaps = true
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.magFilter = THREE.LinearFilter
    })
  }, [textures])

  // Uniform target bounding box size for all stickers
  const TARGET_SIZE = 0.48

  // Compute uniform scale per texture so every sticker has the exact same visual footprint
  const scales = useMemo(() => {
    return textures.map((tex) => {
      const img = tex.image as HTMLImageElement | undefined
      if (img && img.width && img.height) {
        const maxDim = Math.max(img.width, img.height)
        return {
          x: (img.width / maxDim) * TARGET_SIZE,
          y: (img.height / maxDim) * TARGET_SIZE,
        }
      }
      return { x: TARGET_SIZE, y: TARGET_SIZE }
    })
  }, [textures, TARGET_SIZE])

  const count = STICKER_PATHS.length // Exactly 14 stickers: 1:1 mapping with textures for zero duplicates!
  const groupRef = useRef<THREE.Group>(null)

  // Initialize each sticker with a unique texture index (0 to 13) — no duplicate stickers on screen!
  const stickers = useMemo<StickerItem[]>(() => {
    // Shuffle indices so initial layout is organic
    const indices = Array.from({ length: count }, (_, i) => i).sort(() => Math.random() - 0.5)

    return indices.map((textureIndex, i) => {
      const x = -4.2 + ((i * 1.35) % 8.4) + (Math.random() - 0.5) * 0.4
      // Evenly distribute across visible viewport height [-3.0, 3.2]
      const y = -2.8 + (i / count) * 6.0 + (Math.random() - 0.5) * 0.3
      // Strictly behind the glass centerpiece (which is at z = 0)
      const z = -0.5 - (i % 3) * 0.35

      // Crossed trajectory slopes: alternating left-down and right-down straight lines
      const direction = i % 2 === 0 ? 1 : -1
      const slopeAngle = 0.002 + Math.random() * 0.002
      const vx = direction * slopeAngle

      // Serene downward fall speed
      const vy = -(0.007 + (i % 4) * 0.001)

      return {
        x,
        y,
        z,
        vx,
        vy,
        textureIndex,
      }
    })
  }, [count])

  const meshRefs = useRef<(THREE.Mesh | null)[]>([])

  // Priority -1 ensures sticker positions are updated BEFORE the FBO capture in GlassCenterpiece
  useFrame((state, delta) => {
    if (!groupRef.current) return

    const clampedDelta = Math.min(delta, 0.1)
    const scroll = getLenisScrollSnapshot()
    const scrollT = scroll.scrollTop / size.height
    
    // Smoothly fade out stickers as user scrolls down: 100% at hero -> 0% by project section
    const opacity = 1.0 - smoothstep(0.15, 0.80, scrollT)
    
    if (opacity <= 0.001) {
      groupRef.current.visible = false
      return // Completely hidden and skip processing in project section
    }

    groupRef.current.visible = true
    
    // Upward rise matching centerpiece
    groupRef.current.position.y = Math.min(scrollT, 1.5) * 3.8

    // Mouse-responsive + scroll right tilt matching the centerpiece
    const pointer = getPointerUV()
    const scrollFactor = Math.min(scrollT, 1.0)
    const targetRotX = -(pointer.y - 0.5) * 0.20 - scrollFactor * 0.15
    const targetRotY = (pointer.x - 0.5) * 0.25 + scrollFactor * ((80 * Math.PI) / 180)
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.08)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.08)
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.08)

    stickers.forEach((p, idx) => {
      const mesh = meshRefs.current[idx]
      if (!mesh) return

      const mat = mesh.material as THREE.MeshBasicMaterial
      if (mat) {
        mat.opacity = opacity
      }

      // Straight diagonal motion at slow, steady speed (crossed paths)
      p.x += p.vx * (clampedDelta * 60)
      p.y += p.vy * (clampedDelta * 60)

      // Seamless vertical loop: reset to top when exiting bottom of screen
      if (p.y < -3.2) {
        p.y = 3.2 + Math.random() * 0.5
        p.x = (Math.random() - 0.5) * 9.0
      }

      // Horizontal screen bounds wrapping
      if (p.x > 5.5) p.x = -5.5
      if (p.x < -5.5) p.x = 5.5

      // Straight upright orientation (0 tilt), positioned behind centerpiece
      mesh.position.set(p.x, p.y, p.z)
      mesh.rotation.set(0, 0, 0)
      const scale = scales[p.textureIndex]
      mesh.scale.set(scale.x, scale.y, 1)
    })
  }, -1)

  return (
    <group ref={groupRef}>
      {stickers.map((p, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            meshRefs.current[idx] = el
          }}
          position={[p.x, p.y, p.z]}
          renderOrder={5}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={textures[p.textureIndex]}
            transparent
            opacity={1}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}




