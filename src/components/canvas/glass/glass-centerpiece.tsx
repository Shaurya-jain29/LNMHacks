'use client'

import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FallingStickers } from './stickers'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { getPointerUV, isPointerInside } from '@/lib/pointer-bus'
import { createRingLightFollower } from './ring-light-follower'
import fontData from '../../../../public/helvetiker_bold.typeface.json'

// Load animation: gentle scale-up from 50% to 100% (target scale 1.22)
const LOAD_TARGET_SCALE = 1.22 // +21% total larger base size
const LOAD_SCALE_FROM = 0.61   // 50% of target scale
const LOAD_DURATION = 2.5      // seconds

// Scroll behavior: centerpiece rises UP, shrinks, and tilts to its right up to 80 degrees
const SCROLL_RISE_SPEED = 3.8
const SCROLL_SCALE_MIN = 0.38 * LOAD_TARGET_SCALE
const SCROLL_TILT_RIGHT_MAX = (80 * Math.PI) / 180 // 80 degrees (~1.396 rad)

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

const glassVertexShader = `
varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vLocalNormal = normal; // Object-space normal for invariant bevel detection
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

const glassFragmentShader = `
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec3 uLightPos;
uniform float uLightIntensity;
uniform float uTime;
uniform vec3 uCameraPos;

varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec3 vWorldPosition;

void main() {
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorldPosition);
  float NdotV = clamp(dot(N, V), 0.0, 1.0);
  
  // Object-space bevel factor: 0.0 on flat front face, 1.0 on curved bevels (invariant to model tilt!)
  float edgeFactor = clamp(length(vLocalNormal.xy) * 2.2, 0.0, 1.0);
  edgeFactor = smoothstep(0.12, 0.70, edgeFactor);
  
  // Refraction offset: purely on bevels, leaving the flat front face 100% 1:1 pixel-exact
  vec2 uvOffset = vLocalNormal.xy * (0.014 * edgeFactor);
  
  // Prismatic chromatic dispersion on bevels
  vec2 dispR = uvOffset * 1.15;
  vec2 dispG = uvOffset;
  vec2 dispB = uvOffset * 0.85;
  
  // 1:1 Pixel-exact direct transmission of background & stickers
  vec3 color = vec3(0.0);
  color.r = texture2D(uTexture, clamp(screenUv + dispR, 0.001, 0.999)).r;
  color.g = texture2D(uTexture, clamp(screenUv + dispG, 0.001, 0.999)).g;
  color.b = texture2D(uTexture, clamp(screenUv + dispB, 0.001, 0.999)).b;
  
  // 1. Fresnel edge reflection (luminous perimeter glow on bevels)
  float fresnel = pow(1.0 - NdotV, 3.0) * edgeFactor;
  vec3 fresnelTint = vec3(0.96, 0.98, 1.0);
  
  // 2. Bevel Specular Rim Glint (STRICTLY on curved bevel edges, ZERO blob on flat front)
  vec3 L = normalize(uLightPos - vWorldPosition);
  vec3 H = normalize(L + V);
  float NdotH = clamp(dot(N, H), 0.0, 1.0);
  float specular = pow(NdotH, 24.0) * edgeFactor * (uLightIntensity * 1.5);
  
  // Grazing bevel rim streak
  float rimGlint = pow(1.0 - NdotV, 2.0) * pow(clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0), 2.5) * edgeFactor * (uLightIntensity * 1.8);
  
  // Final composite: 1:1 crystal-clear background/stickers + edge fresnel + specular rim glints
  vec3 finalGlass = color + fresnel * fresnelTint * 0.25 + (specular + rimGlint) * vec3(1.0);
  
  gl_FragColor = vec4(finalGlass, 1.0);
}
`

export function GlassCenterpiece() {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const ringFollower = useMemo(() => createRingLightFollower(), [])
  const loadElapsedRef = useRef(0)
  const { size, gl, scene, camera } = useThree()

  // FBO: create at a reasonable initial size; we'll sync it every frame
  const fbo = useMemo(() => {
    return new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    })
  }, [])

  const uniforms = useMemo(() => ({
    uTexture: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uLightPos: { value: new THREE.Vector3(0, 0, 1.5) },
    uLightIntensity: { value: 1.8 },
    uTime: { value: 0 },
    uCameraPos: { value: new THREE.Vector3(0, 0, 5) },
  }), [])

  const geometry = useMemo(() => {
    const loader = new FontLoader()
    const font = loader.parse(fontData as any)

    // "LNM" (top line) - proportional bevels
    const geomLNM = new TextGeometry('LNM', {
      font,
      size: 0.65,
      depth: 0.12,
      curveSegments: 16,
      bevelEnabled: true,
      bevelThickness: 0.030,
      bevelSize: 0.022,
      bevelOffset: 0,
      bevelSegments: 4,
    })

    // "Hacks" (bottom line base) - proportional bevels
    const geomHACKS = new TextGeometry('Hacks', {
      font,
      size: 0.48,
      depth: 0.10,
      curveSegments: 16,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.016,
      bevelOffset: 0,
      bevelSegments: 4,
    })

    // "9.0" - clean, non-pinching bevels scaled for size 0.35
    const geom90 = new TextGeometry('9.0', {
      font,
      size: 0.35,
      depth: 0.09,
      curveSegments: 16,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.010,
      bevelOffset: 0,
      bevelSegments: 3,
    })

    geomHACKS.computeBoundingBox()
    const hacksWidth = geomHACKS.boundingBox!.max.x - geomHACKS.boundingBox!.min.x
    geom90.translate(hacksWidth + 0.08, 0, 0)

    const geomBottom = BufferGeometryUtils.mergeGeometries([geomHACKS, geom90], false)
    geomBottom.computeBoundingBox()

    geomLNM.computeBoundingBox()
    const lnmMinX = geomLNM.boundingBox!.min.x
    const btmMinX = geomBottom.boundingBox!.min.x

    geomLNM.translate(-lnmMinX, 0.30, 0)
    geomBottom.translate(-btmMinX, -0.30, 0)

    const merged = BufferGeometryUtils.mergeGeometries([geomLNM, geomBottom], false)

    merged.computeBoundingBox()
    const box = merged.boundingBox!
    const center = new THREE.Vector3()
    box.getCenter(center)
    merged.translate(-center.x, -center.y, -center.z)

    return merged
  }, [])

  useFrame((state, delta) => {
    if (!groupRef.current || !materialRef.current || !meshRef.current) return

    const clampedDelta = Math.min(delta, 0.1)
    loadElapsedRef.current += clampedDelta

    // === LOAD ANIMATION: gentle scale-up from 50% to 100% (+16% larger base size) ===
    const loadProgress = Math.min(1.0, loadElapsedRef.current / LOAD_DURATION)
    const easedLoad = easeOutQuart(loadProgress)
    const loadScale = THREE.MathUtils.lerp(LOAD_SCALE_FROM, LOAD_TARGET_SCALE, easedLoad)

    // === SCROLL: centerpiece rises UP, shrinks, and tilts ===
    const scroll = getLenisScrollSnapshot()
    const scrollT = Math.min(scroll.scrollTop / size.height, 1.5) // 0 at top, ~1 at 1vh scroll
    const t = state.clock.elapsedTime
    const idleFloat = Math.sin(t * 1.5) * 0.04

    // Position: rises UPWARD as you scroll down
    const scrollY = scrollT * SCROLL_RISE_SPEED
    const finalY = scrollY + idleFloat
    groupRef.current.position.set(0, finalY, 0)

    // Scale: shrinks as you scroll, combined with load animation
    const scrollScale = THREE.MathUtils.lerp(1.0, SCROLL_SCALE_MIN, Math.min(scrollT * 1.2, 1.0))
    const combinedScale = loadScale * scrollScale
    groupRef.current.scale.set(combinedScale, combinedScale, combinedScale)

    // === POINTER INTERACTIVITY ===
    const pointer = getPointerUV()
    const inside = isPointerInside()
    const mappedX = (pointer.x - 0.5) * 10
    const mappedY = (pointer.y - 0.5) * 6
    const lightCoords = ringFollower(mappedX, mappedY, inside, clampedDelta)

    // Sync FBO + uResolution to ACTUAL drawing buffer pixels
    const dbW = gl.domElement.width
    const dbH = gl.domElement.height
    if (fbo.width !== dbW || fbo.height !== dbH) {
      fbo.setSize(dbW, dbH)
    }
    materialRef.current.uniforms.uResolution.value.set(dbW, dbH)
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    materialRef.current.uniforms.uLightPos.value.set(
      lightCoords.x,
      lightCoords.y + finalY,
      1.1
    )
    materialRef.current.uniforms.uCameraPos.value.copy(camera.position)

    // === TILT: mouse-responsive + scroll-driven tilt to its right up to 80 degrees ===
    const mouseRotX = -(pointer.y - 0.5) * 0.20
    const mouseRotY = (pointer.x - 0.5) * 0.25

    // Tilt to its right up to 80 degrees as user scrolls down
    const scrollFactor = Math.min(scrollT, 1.0)
    const scrollRotY = scrollFactor * SCROLL_TILT_RIGHT_MAX
    const scrollRotX = scrollFactor * -0.15 // subtle 3D pitch depth

    const targetRotX = mouseRotX + scrollRotX
    const targetRotY = mouseRotY + scrollRotY
    const targetRotZ = 0

    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.08)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.08)
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotZ, 0.08)

    // Capture scene (with stickers) into FBO
    meshRef.current.visible = false
    gl.setRenderTarget(fbo)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    meshRef.current.visible = true

    materialRef.current.uniforms.uTexture.value = fbo.texture
  })

  return (
    <>
      <group
        ref={groupRef}
        position={[0, 0, 0]}
        scale={LOAD_SCALE_FROM}
      >
        {/* renderOrder=10 ensures glass always composites ON TOP of stickers (renderOrder=5) */}
        <mesh ref={meshRef} geometry={geometry} renderOrder={10}>
          <shaderMaterial
            ref={materialRef}
            vertexShader={glassVertexShader}
            fragmentShader={glassFragmentShader}
            uniforms={uniforms}
            transparent={true}
            depthWrite={false}
          />
        </mesh>
      </group>
      <FallingStickers />
    </>
  )
}
