'use client'

import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { createCurlStrengthSampler } from './curl-strength'
import { vertexShader, fragmentShader } from '@/shaders/dom-sync'
import { domRegistry } from '@/lib/dom-registry'
import { PROJECTS } from '@/components/dom/project-grid'

function ProjectMesh({ project }: { project: any }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { size } = useThree()
  
  const [map1, map2] = useTexture([project.img1, project.img2])
  
  // Apply sRGB correctly
  useMemo(() => {
    if (map1) map1.colorSpace = THREE.SRGBColorSpace
    if (map2) map2.colorSpace = THREE.SRGBColorSpace
  }, [map1, map2])
  
  const hoverSpring = useRef(0)
  const polaritySpring = useRef(1.0)
  const curlSamplerRef = useRef(createCurlStrengthSampler())

  const uniforms = useMemo(() => ({
    map: { value: map1 },
    mapHover: { value: map2 },
    uRect: { value: new THREE.Vector4(0, 0, 0, 0) },
    uHoverRevealProgress: { value: 0 },
    uDotPixelSize: { value: 8.0 },
    uViewportPx: { value: new THREE.Vector2(size.width, size.height) },
    uPolarityPositive: { value: 1.0 },
    uCurlStrength: { value: 0 }
  }), [map1, map2, size])

  useFrame((state, delta) => {
    if (!materialRef.current || !meshRef.current) return
    const entry = domRegistry.getEntry(project.id)
    if (!entry || !entry.el) {
      meshRef.current.visible = false
      return
    }

    const rect = entry.el.getBoundingClientRect()
    const isVisible = rect.bottom > -300 && rect.top < window.innerHeight + 300
    meshRef.current.visible = isVisible
    if (!isVisible) return

    const clampedDelta = Math.min(delta, 0.1)
    const scroll = getLenisScrollSnapshot()
    const curl = curlSamplerRef.current(scroll.scrollTop, clampedDelta)

    const x = rect.left / size.width
    const y = 1.0 - (rect.top + rect.height) / size.height
    const w = rect.width / size.width
    const h = rect.height / size.height

    const mat = materialRef.current
    mat.uniforms.uRect.value.set(x, y, w, h)
    mat.uniforms.uViewportPx.value.set(size.width, size.height)
    mat.uniforms.uCurlStrength.value = curl

    const targetHover = entry.hovered ? 1 : 0
    hoverSpring.current += (targetHover - hoverSpring.current) * (1 - Math.exp(-clampedDelta * 8))
    mat.uniforms.uHoverRevealProgress.value = hoverSpring.current
    mat.uniforms.uPolarityPositive.value = 1.0
  })

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={2}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}

export function ProjectMeshes() {
  return (
    <group>
      {/* 3D Mesh for the About image placeholder */}
      <ProjectMesh project={{ id: 'about-image', img1: '/projects/p1.svg', img2: '/projects/p2.svg' }} />
      
      {/* 3D Meshes for the project showcase */}
      {PROJECTS.map((p) => (
        <ProjectMesh key={p.id} project={p} />
      ))}
    </group>
  )
}

