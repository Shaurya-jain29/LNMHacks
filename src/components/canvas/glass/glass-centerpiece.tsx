'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, MeshTransmissionMaterial } from '@react-three/drei'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FallingStickers } from './stickers'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { getPointerUV } from '@/lib/pointer-bus'

export function GlassCenterpiece() {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Object3D>(null)
  const { size } = useThree()
  
  // Use the exact GLB requested by the user
  const { scene: gltf } = useGLTF('/LNM_Hacks.glb')

  const geometry = useMemo(() => {
    // Collect all geometries
    const geometries: THREE.BufferGeometry[] = []
    gltf.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const geom = mesh.geometry.clone()
        geom.applyMatrix4(mesh.matrixWorld)
        geometries.push(geom)
      }
    })

    if (geometries.length === 0) {
      return new THREE.BoxGeometry()
    }

    // Merge into one
    let merged = BufferGeometryUtils.mergeGeometries(geometries, false)

    // Center at origin
    merged.computeBoundingBox()
    const box = merged.boundingBox!
    const center = new THREE.Vector3()
    box.getCenter(center)
    merged.translate(-center.x, -center.y, -center.z)

    // Undo the ~22.5° Y rotation baked into the GLB's parent node
    const undoRotation = new THREE.Matrix4().makeRotationY(Math.PI / 8)
    merged.applyMatrix4(undoRotation)

    // Normalize scale
    merged.computeBoundingBox()
    const box2 = merged.boundingBox!
    const boxSize = new THREE.Vector3()
    box2.getSize(boxSize)
    const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z)
    if (maxDim > 0) {
      const s = 2.0 / maxDim
      merged.scale(s, s, s)
    }

    // Squash it to make it thick glass but not overly extruded
    merged.scale(1, 1, 0.25)

    // Weld vertices and fix normals so smooth shading works on this GLB
    merged.deleteAttribute('normal')
    merged = BufferGeometryUtils.mergeVertices(merged, 1e-4)
    merged.computeVertexNormals()

    return merged
  }, [gltf])

  const lightRef = useRef<THREE.PointLight>(null)
  const targetLightPos = useRef(new THREE.Vector3(0, 0, 3))

  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return
    
    // Read scroll to position the centerpiece
    const scroll = getLenisScrollSnapshot()
    const scrollYOffset = (scroll.scrollTop / size.height) * 10
    groupRef.current.position.y = -scrollYOffset
    
    // Add a very subtle floating effect
    const t = state.clock.elapsedTime
    groupRef.current.position.y += Math.sin(t * 1.5) * 0.05
    groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.05
    groupRef.current.rotation.y = Math.cos(t * 0.6) * 0.05

    // Smoothly track mouse with the light
    const pointer = getPointerUV()
    targetLightPos.current.x = (pointer.x - 0.5) * 15
    targetLightPos.current.y = -(pointer.y - 0.5) * 15
    
    if (lightRef.current) {
      lightRef.current.position.lerp(targetLightPos.current, 0.1)
    }
  })

  return (
    <>
      {/* Interactive mouse light - greatly reduced intensity to stop lens flare blowouts */}
      <pointLight ref={lightRef} intensity={3} distance={15} color="#ffffff" />
      
      {/* Subtle ambient fill so the glass isn't completely pitch black in shadows */}
      <ambientLight intensity={0.2} />

      <group ref={groupRef} position={[0, 0, 0]} scale={1.8}>
        <mesh ref={meshRef} geometry={geometry}>
          <MeshTransmissionMaterial
            backside={true}
            samples={4}
            thickness={1.5}
            chromaticAberration={0.06}
            anisotropy={0.1}
            distortion={0.0}
            distortionScale={0.3}
            temporalDistortion={0.1}
            iridescence={0.0}
            clearcoat={1.0}
            clearcoatRoughness={0.05}
            roughness={0.05}
            transmission={1.0}
            ior={1.25}
            color="#4a8dff" // Brighter electric blue tint
            attenuationDistance={1.5}
            attenuationColor="#ffffff"
          />
        </mesh>
      </group>
      <FallingStickers />
    </>
  )
}

useGLTF.preload('/LNM_Hacks.glb')
