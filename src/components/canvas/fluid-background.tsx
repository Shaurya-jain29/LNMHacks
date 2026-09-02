'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { getPointerUV, isPointerInside } from '@/lib/pointer-bus'
import { getLenisScrollSnapshot } from '@/lib/scroll-bus'

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.999, 1.0);
}
`

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uAspect;
uniform vec2 uPointerGlow;
uniform float uGlowIntensity;
uniform vec2 uPointerDistort;
uniform float uDistortionStrength;
uniform float uDisabled;
uniform float uScroll;

varying vec2 vUv;

// --- Fast Low-ALU 3D Simplex Noise ---
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
  vec2 uv = vUv;

  vec3 baseSkyBlue = vec3(0.686, 0.835, 0.957);

  if (uDisabled > 0.5) {
    gl_FragColor = vec4(baseSkyBlue, 1.0);
    return;
  }

  // 1. Hero World-Space Fluid Wave Field
  vec2 worldCoord = vec2(uv.x * uAspect, uv.y);
  
  float angle = 0.66;
  float cosA = cos(angle);
  float sinA = sin(angle);
  vec2 waveUv = vec2(
    worldCoord.x * cosA - worldCoord.y * sinA,
    worldCoord.x * sinA + worldCoord.y * cosA
  );

  float waveNoise = snoise(vec3(waveUv.y * 3.4, waveUv.x * 1.6, uTime * 0.04));
  float wave1 = sin(waveUv.y * 12.0 + waveNoise * 2.2 - uTime * 0.25) * 0.5 + 0.5;
  float wave2 = sin(waveUv.y * 22.0 - waveNoise * 1.4 + uTime * 0.18) * 0.5 + 0.5;
  float wave3 = sin(waveUv.y * 36.0 + waveNoise * 0.8 - uTime * 0.12) * 0.5 + 0.5;
  
  float bgWaves = wave1 * 0.48 + wave2 * 0.36 + wave3 * 0.16;
  bgWaves = smoothstep(0.10, 0.90, bgWaves);
  bgWaves = pow(bgWaves, 1.2);

  vec3 deepSkyBlue = vec3(0.60, 0.80, 0.95);
  vec3 brightSkyBlue = vec3(0.76, 0.89, 0.98);
  vec3 ambientBase = mix(deepSkyBlue, brightSkyBlue, bgWaves * 0.45);

  // 2. Moving Pointer Spotlight
  vec2 delta = uv - uPointerGlow;
  vec2 aspectDelta = vec2(delta.x * uAspect, delta.y);
  float dist = length(aspectDelta);

  float spotRadius = 0.86;
  float spotMask = exp(-pow(dist / (spotRadius * 0.78), 1.85));
  spotMask = smoothstep(0.005, 1.0, spotMask);

  float waveIllumination = spotMask * (0.35 + bgWaves * 0.65) * uGlowIntensity;
  vec3 warmWhite = vec3(1.0, 0.99, 0.94);
  vec3 sunnyGold  = vec3(0.97, 0.94, 0.86);
  vec3 waveTint   = mix(sunnyGold, warmWhite, bgWaves);
  vec3 heroColor = mix(ambientBase, waveTint, clamp(waveIllumination * 0.85, 0.0, 1.0));

  // 3. Work Section Background: Crisp Blueprint Dot-Grid (matching haoqi.design)
  vec2 pixelPos = uv * uResolution;
  float gridSpacing = 28.0;
  vec2 cellPos = mod(pixelPos, vec2(gridSpacing));
  
  // Dot matrix at grid intersections
  float dotDist = length(cellPos - vec2(gridSpacing * 0.5));
  float gridDot = 1.0 - smoothstep(1.0, 2.2, dotDist);
  
  // Crosshairs every 4 cells
  vec2 majorCell = mod(pixelPos, vec2(gridSpacing * 4.0));
  float crossDistX = abs(majorCell.x - gridSpacing * 2.0);
  float crossDistY = abs(majorCell.y - gridSpacing * 2.0);
  float crossH = (1.0 - smoothstep(0.5, 1.2, crossDistY)) * (1.0 - step(4.0, crossDistX));
  float crossV = (1.0 - smoothstep(0.5, 1.2, crossDistX)) * (1.0 - step(4.0, crossDistY));
  float crosshairs = clamp(crossH + crossV, 0.0, 1.0);

  // Clean luminous blueprint tones
  vec3 workBase = vec3(0.93, 0.96, 0.99);
  vec3 gridDotColor = vec3(0.72, 0.82, 0.93);
  vec3 crossColor = vec3(0.58, 0.72, 0.88);
  
  vec3 workPattern = mix(workBase, gridDotColor, gridDot * 0.45);
  workPattern = mix(workPattern, crossColor, crosshairs * 0.55);

  // Cursor sunlight on work grid
  vec3 workSunnyGlow = vec3(1.0, 0.99, 0.95);
  vec3 workColor = mix(workPattern, workSunnyGlow, spotMask * 0.22 * uGlowIntensity);

  // Smooth background switch based on scroll progress
  float scrollT = smoothstep(0.05, 0.85, uScroll);
  vec3 finalColor = mix(heroColor, workColor, scrollT);

  gl_FragColor = vec4(finalColor, 1.0);
}
`

export function FluidBackground() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { size } = useThree()

  const easedPointerGlow = useRef(new THREE.Vector2(0.5, 0.5))
  const easedGlowIntensity = useRef(0)
  const easedPointerDistort = useRef(new THREE.Vector2(0.5, 0.5))
  const currentDistort = useRef(0)
  const prevPointer = useRef(new THREE.Vector2(0.5, 0.5))
  const scrollSpring = useRef(0)

  const [disabled, setDisabled] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const checkLowEnd = () => {
      const isReduced = mediaQuery.matches
      const isMobileSmall = window.innerWidth < 640
      const isLowConcurrency =
        typeof navigator !== 'undefined' &&
        navigator.hardwareConcurrency &&
        navigator.hardwareConcurrency <= 2
      return isReduced || isMobileSmall || Boolean(isLowConcurrency)
    }

    setDisabled(checkLowEnd())

    const handler = () => setDisabled(checkLowEnd())
    mediaQuery.addEventListener('change', handler)
    window.addEventListener('resize', handler)
    return () => {
      mediaQuery.removeEventListener('change', handler)
      window.removeEventListener('resize', handler)
    }
  }, [])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uAspect: { value: size.width / size.height },
    uPointerGlow: { value: new THREE.Vector2(0.5, 0.5) },
    uGlowIntensity: { value: 0 },
    uPointerDistort: { value: new THREE.Vector2(0.5, 0.5) },
    uDistortionStrength: { value: 0 },
    uDisabled: { value: 0 },
    uScroll: { value: 0 },
  }), [size])

  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height)
    uniforms.uAspect.value = size.width / size.height
  }, [size, uniforms])

  useFrame((state, delta) => {
    if (!materialRef.current) return

    const clampedDelta = Math.min(delta, 0.1)
    const rawPointer = getPointerUV()

    // Read scroll for dynamic background switch
    const scroll = getLenisScrollSnapshot()
    const targetScroll = Math.min(scroll.scrollTop / (size.height * 0.8), 1.0)
    scrollSpring.current = THREE.MathUtils.lerp(scrollSpring.current, targetScroll, Math.min(1.0, clampedDelta * 6.0))

    // Velocity for subtle distortion
    const dx = (rawPointer.x - prevPointer.current.x) * (size.width / Math.min(size.width, size.height))
    const dy = rawPointer.y - prevPointer.current.y
    const frameDist = Math.hypot(dx, dy)
    const instantSpeed = clampedDelta > 0 ? frameDist / clampedDelta : 0
    prevPointer.current.copy(rawPointer)

    const targetDistort = Math.min(instantSpeed * 0.55, 1.0)
    if (targetDistort > currentDistort.current) {
      currentDistort.current = THREE.MathUtils.lerp(
        currentDistort.current,
        targetDistort,
        Math.min(1.0, clampedDelta * 22.0)
      )
    } else {
      currentDistort.current = THREE.MathUtils.damp(currentDistort.current, 0.0, 1.6, clampedDelta)
    }

    easedPointerGlow.current.copy(rawPointer)
    easedPointerDistort.current.copy(rawPointer)

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    materialRef.current.uniforms.uPointerGlow.value.copy(rawPointer)
    materialRef.current.uniforms.uGlowIntensity.value = 1.0
    materialRef.current.uniforms.uPointerDistort.value.copy(rawPointer)
    materialRef.current.uniforms.uDistortionStrength.value = currentDistort.current
    materialRef.current.uniforms.uAspect.value = size.width / size.height
    materialRef.current.uniforms.uResolution.value.set(size.width, size.height)
    materialRef.current.uniforms.uDisabled.value = disabled ? 1.0 : 0.0
    materialRef.current.uniforms.uScroll.value = scrollSpring.current
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


