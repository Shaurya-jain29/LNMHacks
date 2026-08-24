import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'

// Shape drawing helpers for the atlas
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
    const method = i === 0 ? 'moveTo' : 'lineTo'
    ctx[method](cx + r * Math.cos(angle), cy + r * Math.sin(angle))
  }
  ctx.closePath()
  ctx.fill()
}

function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
}

function drawTriangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2
    const method = i === 0 ? 'moveTo' : 'lineTo'
    ctx[method](cx + r * Math.cos(angle), cy + r * Math.sin(angle))
  }
  ctx.closePath()
  ctx.fill()
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  const s = size * 0.5
  ctx.moveTo(cx, cy + s * 0.4)
  ctx.bezierCurveTo(cx - s, cy - s * 0.6, cx - s * 1.5, cy + s * 0.3, cx, cy + s * 1.2)
  ctx.bezierCurveTo(cx + s * 1.5, cy + s * 0.3, cx + s, cy - s * 0.6, cx, cy + s * 0.4)
  ctx.fill()
}

export function FallingStickers() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  
  const count = 30
  
  // Build a 4x4 atlas of colorful shapes
  const atlasData = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const cell = 128 // 4x4 grid = 16 cells, each 128px
    
    // Palette inspired by haoqi.design — bold, flat, high contrast
    const palette = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#FF9FF3', '#54A0FF',
      '#5F27CD', '#01A3A4', '#F368E0', '#FF6348',
      '#2ED573', '#1E90FF', '#FFA502', '#EE5A24'
    ]
    
    const shapes = [drawStar, drawCircle, drawTriangle, drawHeart]
    
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const idx = row * 4 + col
        const cx = col * cell + cell / 2
        const cy = row * cell + cell / 2
        shapes[idx % shapes.length](ctx, cx, cy, cell * 0.35, palette[idx])
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    return texture
  }, [])
  
  const dummy = useMemo(() => new THREE.Object3D(), [])
  
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 12 + 4,
      z: -1.5 + Math.random() * -3, // Behind the glass
      vy: -0.008 - Math.random() * 0.015, // Gentle drift
      rotY: Math.random() * Math.PI,
      rotZ: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.015,
      uvIndex: Math.floor(Math.random() * 16),
      scale: 0.3 + Math.random() * 0.5
    }))
  }, [count])
  
  const uvOffsetAttr = useMemo(() => {
    const arr = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      const idx = particles[i].uvIndex
      const col = idx % 4
      const row = Math.floor(idx / 4)
      arr[i * 4 + 0] = col * 0.25
      arr[i * 4 + 1] = row * 0.25
      arr[i * 4 + 2] = 0.25
      arr[i * 4 + 3] = 0.25
    }
    return new THREE.InstancedBufferAttribute(arr, 4)
  }, [particles, count])

  useFrame((state) => {
    if (!meshRef.current) return
    
    // Kill switch
    const scroll = getLenisScrollSnapshot()
    const scrollYOffset = (scroll.scrollTop / state.size.height) * 10
    if (scrollYOffset > 15) return
    
    particles.forEach((p, i) => {
      p.y += p.vy
      p.rotZ += p.vRot
      p.rotY += p.vRot * 0.5
      
      if (p.y < -10) {
        p.y = 10
        p.x = (Math.random() - 0.5) * 8
      }
      
      dummy.position.set(p.x, p.y, p.z)
      dummy.rotation.set(0, p.rotY, p.rotZ)
      dummy.scale.setScalar(p.scale)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      map: atlasData,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.1
    })
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute vec4 instanceUvRect;
        ${shader.vertexShader}
      `.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        vMapUv = instanceUvRect.xy + vMapUv * instanceUvRect.zw;
        `
      )
    }
    return mat
  }, [atlasData])

  return (
    <instancedMesh ref={meshRef} material={material} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 1]}>
        <instancedBufferAttribute attach="attributes-instanceUvRect" args={[uvOffsetAttr.array, 4]} />
      </planeGeometry>
    </instancedMesh>
  )
}
