'use client'

import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { createDomRectSampler } from '@/lib/dom-rect-sampler'
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
    map1.colorSpace = THREE.SRGBColorSpace
    map2.colorSpace = THREE.SRGBColorSpace
  }, [map1, map2])
  
  const hoverSpring = useRef(0)
  const polaritySpring = useRef(0)
  const enteredViewport = useRef(false)

  const uniforms = useMemo(() => ({
    map: { value: map1 },
    mapHover: { value: map2 },
    uRect: { value: new THREE.Vector4(0, 0, 0, 0) },
    uHoverRevealProgress: { value: 0 },
    uDotPixelSize: { value: 8.0 },
    uViewportPx: { value: new THREE.Vector2(size.width, size.height) },
    uPolarityPositive: { value: 0 },
    uCurlStrength: { value: 0 }
  }), [map1, map2])

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uViewportPx.value.set(size.width, size.height)
    }
  }, [size])
  
  useEffect(() => {
    const updateMesh = (rect: {top: number, left: number, width: number, height: number}, curl: number, hovered: boolean, delta: number) => {
      if (!materialRef.current || !meshRef.current) return
      
      const isVisible = rect.top < size.height + 400 && rect.top + rect.height > -400
      meshRef.current.visible = isVisible
      if (!isVisible) return // Kill switch: skip updates/rendering if far off screen

      const material = materialRef.current
      const x = rect.left / size.width
      const y = 1.0 - (rect.top + rect.height) / size.height // flip Y
      const w = rect.width / size.width
      const h = rect.height / size.height
      material.uniforms.uRect.value.set(x, y, w, h)
      material.uniforms.uCurlStrength.value = curl
      
      const targetHover = hovered ? 1 : 0
      hoverSpring.current += (targetHover - hoverSpring.current) * (1 - Math.exp(-delta * 8))
      material.uniforms.uHoverRevealProgress.value = hoverSpring.current

      const isActuallyInView = rect.top < size.height && rect.top + rect.height > 0
      if (isActuallyInView && !enteredViewport.current) {
        enteredViewport.current = true
      }
      
      const prefersReducedMotion = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
      if (prefersReducedMotion) {
         material.uniforms.uPolarityPositive.value = 1.0
      } else {
        const targetPolarity = enteredViewport.current ? 1 : 0
        polaritySpring.current += (targetPolarity - polaritySpring.current) * (1 - Math.exp(-delta * 2))
        material.uniforms.uPolarityPositive.value = polaritySpring.current
      }
    }
    
    const event = new CustomEvent('register-project-mesh', { detail: { id: project.id, update: updateMesh } })
    window.dispatchEvent(event)
    return () => {
      const event = new CustomEvent('unregister-project-mesh', { detail: { id: project.id } })
      window.dispatchEvent(event)
    }
  }, [size, project.id])

  return (
    <mesh ref={meshRef} frustumCulled={false}>
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
  const meshUpdaters = useRef<Record<string, Function>>({})
  const samplerRef = useRef(createDomRectSampler())
  const curlSamplerRef = useRef(createCurlStrengthSampler())
  const domEntriesRef = useRef<{key: string, el: HTMLElement, hovered: boolean}[]>([])

  useEffect(() => {
    const updateEntries = () => {
      domEntriesRef.current = domRegistry.getEntries()
    }
    updateEntries()
    const unsubscribe = domRegistry.subscribe(updateEntries)
    return () => { unsubscribe() }
  }, [])

  useEffect(() => {
    const onRegister = (e: any) => { meshUpdaters.current[e.detail.id] = e.detail.update }
    const onUnregister = (e: any) => { delete meshUpdaters.current[e.detail.id] }
    window.addEventListener('register-project-mesh', onRegister)
    window.addEventListener('unregister-project-mesh', onUnregister)
    return () => {
      window.removeEventListener('register-project-mesh', onRegister)
      window.removeEventListener('unregister-project-mesh', onUnregister)
    }
  }, [])

  useFrame((state, delta) => {
    const scroll = getLenisScrollSnapshot()
    
    const rects = samplerRef.current.tick(scroll.scrollTop, domEntriesRef.current)
    const curl = curlSamplerRef.current(scroll.scrollTop, delta)

    domEntriesRef.current.forEach((entry) => {
      const updater = meshUpdaters.current[entry.key]
      const rect = rects[entry.key]
      if (updater && rect) {
        updater(rect, curl, entry.hovered, delta)
      }
    })
  }, -3) // Priority -3 to run before render

  return (
    <group>
      {PROJECTS.map(p => (
        <ProjectMesh key={p.id} project={p} />
      ))}
    </group>
  )
}
