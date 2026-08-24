'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { MeshTransmissionMaterial, Center, Float } from '@react-three/drei'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FallingStickers } from './stickers'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { getPointerUV } from '@/lib/pointer-bus'
import fontData from '../../../../public/gentilis_bold.typeface.json'

export function GlassCenterpiece() {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const targetLightPos = useRef(new THREE.Vector3(0, 0, 3))
  const { size } = useThree()

  const geometry = useMemo(() => {
    const loader = new FontLoader()
    const font = loader.parse(fontData)

    const geomTop = new TextGeometry('LNM', {
      font,
      size: 0.85,
      depth: 0.35,
      curveSegments: 20,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.08,
      bevelOffset: 0,
      bevelSegments: 12,
    })

    const geomBottom = new TextGeometry('HACKS 9.0', {
      font,
      size: 0.58,
      depth: 0.32,
      curveSegments: 20,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.07,
      bevelOffset: 0,
      bevelSegments: 12,
    })

    // Center each line horizontally
    geomTop.computeBoundingBox()
    const topBox = geomTop.boundingBox!
    const topWidth = topBox.max.x - topBox.min.x
    geomTop.translate(-topWidth / 2, 0.28, 0)

    geomBottom.computeBoundingBox()
    const btmBox = geomBottom.boundingBox!
    const btmWidth = btmBox.max.x - btmBox.min.x
    geomBottom.translate(-btmWidth / 2, -0.65, 0)

    let merged = BufferGeometryUtils.mergeGeometries([geomTop, geomBottom], false)

    // Center total bounding box
    merged.computeBoundingBox()
    const box = merged.boundingBox!
    const center = new THREE.Vector3()
    box.getCenter(center)
    merged.translate(-center.x, -center.y, -center.z)

    // Weld vertices and calculate smooth normals for pristine glass refraction
    merged.deleteAttribute('normal')
    merged = BufferGeometryUtils.mergeVertices(merged, 1e-3)
    merged.computeVertexNormals()

    return merged
  }, [])

  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return

    // Read scroll to position the centerpiece
    const scroll = getLenisScrollSnapshot()
    const scrollYOffset = (scroll.scrollTop / size.height) * 10
    groupRef.current.position.y = -scrollYOffset

    // Add subtle floating effect
    const t = state.clock.elapsedTime
    groupRef.current.position.y += Math.sin(t * 1.5) * 0.04
    groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.03
    groupRef.current.rotation.y = Math.cos(t * 0.6) * 0.03

    // Smooth mouse-following light position
    const pointer = getPointerUV()
    targetLightPos.current.x = (pointer.x - 0.5) * 12
    targetLightPos.current.y = -(pointer.y - 0.5) * 12

    if (lightRef.current) {
      lightRef.current.position.lerp(targetLightPos.current, 0.1)
    }
  })

  return (
    <>
      {/* Dynamic light tracking pointer */}
      <pointLight ref={lightRef} intensity={2.5} distance={15} color="#ffffff" />
      <ambientLight intensity={0.25} />

      <group ref={groupRef} position={[0, 0, 0]} scale={1.5}>
        <mesh ref={meshRef} geometry={geometry}>
          <MeshTransmissionMaterial
            backside={true}
            samples={6}
            thickness={1.2}
            chromaticAberration={0.06}
            anisotropy={0.1}
            distortion={0.0}
            distortionScale={0.3}
            temporalDistortion={0.1}
            iridescence={0.0}
            clearcoat={1.0}
            clearcoatRoughness={0.05}
            roughness={0.04}
            transmission={1.0}
            ior={1.25}
            color="#3b78ff"
            attenuationDistance={1.4}
            attenuationColor="#ffffff"
          />
        </mesh>
      </group>
      <FallingStickers />
    </>
  )
}
