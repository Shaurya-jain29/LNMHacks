'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FallingStickers } from './stickers'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { getPointerUV, isPointerInside } from '@/lib/pointer-bus'
import { createRingLightFollower } from './ring-light-follower'
import fontData from '../../../../public/helvetiker_bold.typeface.json'

export function GlassCenterpiece() {
  const groupRef = useRef<THREE.Group>(null)
  const ringLightRef = useRef<THREE.PointLight>(null)
  const ringFollower = useMemo(() => createRingLightFollower(), [])
  const { size } = useThree()

  const geometry = useMemo(() => {
    const loader = new FontLoader()
    const font = loader.parse(fontData)

    // "LNM" (top line in basic Helvetiker font)
    const geomLNM = new TextGeometry('LNM', {
      font,
      size: 0.64,
      depth: 0.16,
      curveSegments: 16,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.035,
      bevelOffset: 0,
      bevelSegments: 8,
    })

    // "Hacks" (bottom line base in basic Helvetiker font)
    const geomHACKS = new TextGeometry('Hacks', {
      font,
      size: 0.46,
      depth: 0.14,
      curveSegments: 16,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.03,
      bevelOffset: 0,
      bevelSegments: 8,
    })

    // "9.0" (in basic Helvetiker font)
    const geom90 = new TextGeometry('9.0', {
      font,
      size: 0.33,
      depth: 0.13,
      curveSegments: 16,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.025,
      bevelOffset: 0,
      bevelSegments: 8,
    })

    // Position "9.0" closely right after "HACKS"
    geomHACKS.computeBoundingBox()
    const hacksWidth = geomHACKS.boundingBox!.max.x - geomHACKS.boundingBox!.min.x
    geom90.translate(hacksWidth + 0.08, 0, 0)

    // Merge HACKS and 9.0 into the complete bottom line
    const geomBottom = BufferGeometryUtils.mergeGeometries([geomHACKS, geom90], false)
    geomBottom.computeBoundingBox()

    // Left-align LNM with the start of HACKS
    geomLNM.computeBoundingBox()
    const lnmMinX = geomLNM.boundingBox!.min.x
    const btmMinX = geomBottom.boundingBox!.min.x

    // Tightened vertical line spacing
    geomLNM.translate(-lnmMinX, 0.28, 0)
    geomBottom.translate(-btmMinX, -0.28, 0)

    let merged = BufferGeometryUtils.mergeGeometries([geomLNM, geomBottom], false)

    // Center the complete unified text geometry at origin
    merged.computeBoundingBox()
    const box = merged.boundingBox!
    const center = new THREE.Vector3()
    box.getCenter(center)
    merged.translate(-center.x, -center.y, -center.z)

    // Weld coincident duplicate vertices and calculate smooth rounded normals for continuous tube bevels
    merged.deleteAttribute('normal')
    merged = BufferGeometryUtils.mergeVertices(merged, 1e-3)
    merged.computeVertexNormals()

    return merged
  }, [])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    
    // Scroll parallax translation
    const scroll = getLenisScrollSnapshot()
    const scrollYOffset = (scroll.scrollTop / size.height) * 10
    groupRef.current.position.y = -scrollYOffset
    
    // Subtle organic floating
    const t = state.clock.elapsedTime
    groupRef.current.position.y += Math.sin(t * 1.5) * 0.04

    // Pointer-driven ring light tracking around the outer circle
    const pointer = getPointerUV()
    const inside = isPointerInside()
    const mappedX = (pointer.x - 0.5) * 10
    const mappedY = (pointer.y - 0.5) * 6

    const lightCoords = ringFollower(mappedX, mappedY, inside, delta)

    if (ringLightRef.current) {
      ringLightRef.current.position.set(lightCoords.x * 0.45, lightCoords.y * 0.45, 1.4)
    }

    // Interactive 3D tilt
    const targetRotX = (pointer.y - 0.5) * 0.12
    const targetRotY = (pointer.x - 0.5) * 0.16
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.08)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.08)
  })

  return (
    <>
      {/* 
        Ring Light Follower:
        Travels strictly on a fixed radius circle around the outer perimeter of the letters.
        It illuminates only the curved edges/bevels and can never drift onto the front face.
      */}
      <pointLight ref={ringLightRef} intensity={14.0} distance={18} color="#ffffff" decay={1.8} />

      {/* 4 peripheral grazing ring lights around the outer edges */}
      <pointLight position={[0, 3.2, 0.8]} intensity={4.0} distance={10} color="#cce0ff" />
      <pointLight position={[0, -3.2, 0.8]} intensity={4.0} distance={10} color="#cce0ff" />
      <pointLight position={[-4.5, 0, 0.8]} intensity={4.0} distance={10} color="#cce0ff" />
      <pointLight position={[4.5, 0, 0.8]} intensity={4.0} distance={10} color="#cce0ff" />

      {/* Ambient fill */}
      <ambientLight intensity={0.45} />

      <group ref={groupRef} position={[0, 0, 0]} scale={1.0}>
        <mesh geometry={geometry}>
          <MeshTransmissionMaterial
            backside={false}
            samples={4}
            resolution={1024}
            thickness={0.24}
            chromaticAberration={0.02}
            anisotropy={0.05}
            distortion={0.0}
            distortionScale={0.0}
            temporalDistortion={0.0}
            iridescence={0.0}
            clearcoat={1.0}
            clearcoatRoughness={0.02}
            roughness={0.015}
            transmission={0.98}
            ior={1.15}
            color="#5898ff"
            attenuationDistance={5.5}
            attenuationColor="#dbe8ff"
          />
        </mesh>
      </group>
      <FallingStickers />
    </>
  )
}
