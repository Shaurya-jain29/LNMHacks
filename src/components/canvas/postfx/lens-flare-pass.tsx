'use client'

import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { lensFlareVertexShader, lensFlareFragmentShader } from '@/shaders/lens-flare'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'

export function LensFlarePass() {
  const { gl, scene, camera, size } = useThree()
  
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
    uThreshold: { value: 0.70 },
    uStreakScale: { value: 2.4 },
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
    // When the bright section containing the glass is scrolled out of viewport, stop the post-pass
    const scroll = getLenisScrollSnapshot()
    const scrollYOffset = (scroll.scrollTop / size.height) * 10
    if (scrollYOffset > 15) {
      gl.render(scene, camera)
      return
    }

    // Render full scene to FBO
    gl.setRenderTarget(mainFbo)
    gl.render(scene, camera)
    
    // Apply Star 6 lens flare pass and render to screen
    quadMesh.material.uniforms.tDiffuse.value = mainFbo.texture
    gl.setRenderTarget(null)
    gl.render(quadScene, quadCamera)
  }, 10)

  return null
}

