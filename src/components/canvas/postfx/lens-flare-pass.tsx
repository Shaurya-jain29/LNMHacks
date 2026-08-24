'use client'

import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { lensFlareVertexShader, lensFlareFragmentShader } from '@/shaders/lens-flare'

export function LensFlarePass() {
  const { gl, scene, camera, size } = useThree()
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  
  const mainFbo = useFBO(size.width, size.height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType
  })

  const quadScene = useMemo(() => new THREE.Scene(), [])
  const quadCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])
  const quadGeometry = useMemo(() => new THREE.PlaneGeometry(2, 2), [])
  
  const uniforms = useMemo(() => ({
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uThreshold: { value: 0.85 },
    uStreakScale: { value: 2.0 },
    uBgColor: { value: new THREE.Color(0.01, 0.02, 0.15) }
  }), [size])

  const quadMesh = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: lensFlareVertexShader,
      fragmentShader: lensFlareFragmentShader,
      uniforms,
      depthWrite: false,
      depthTest: false
    })
    const mesh = new THREE.Mesh(quadGeometry, mat)
    quadScene.add(mesh)
    return mesh
  }, [quadGeometry, quadScene, uniforms])

  useEffect(() => {
    if (quadMesh.material) {
      quadMesh.material.uniforms.uResolution.value.set(size.width, size.height)
      mainFbo.setSize(size.width, size.height)
    }
  }, [size, mainFbo, quadMesh])
  
  useFrame(() => {
    // Render full scene to FBO
    gl.setRenderTarget(mainFbo)
    gl.render(scene, camera)
    
    // Apply lens flare and render to screen
    quadMesh.material.uniforms.tDiffuse.value = mainFbo.texture
    gl.setRenderTarget(null)
    gl.render(quadScene, quadCamera)
  }, 1) // Priority 1 (runs after GlassCenterpiece Priority 2)

  return null
}
