'use client'

import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  // Render at the far clip plane, bypassing the camera projection
  gl_Position = vec4(position.xy, 0.99, 1.0);
}
`

const fragmentShader = `
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

// Classic noise function
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  
  // Slowly evolving noise
  float n = snoise(uv * 1.5 + vec2(uTime * 0.05, uTime * 0.08));
  float n2 = snoise(uv * 3.0 - vec2(uTime * 0.03, uTime * 0.04));
  
  float fluid = (n + n2) * 0.5 + 0.5; // Map to 0-1
  
  // Haoqi.design colors: Rich luminous royal blue background
  vec3 baseColor = vec3(0.015, 0.045, 0.22); // Deep rich royal blue
  vec3 highlightColor = vec3(0.06, 0.16, 0.52); // Luminous electric blue waves
  
  // Mix them based on the fluid noise
  vec3 finalColor = mix(baseColor, highlightColor, smoothstep(0.15, 0.85, fluid));
  
  // Add a very subtle vignette
  float vignette = length(uv - 0.5);
  finalColor = mix(finalColor, vec3(0.005, 0.01, 0.08), vignette * 0.35);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`

export function FluidBackground() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { size } = useThree()
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) }
  }), [size])

  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height)
  }, [size, uniforms])

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}
