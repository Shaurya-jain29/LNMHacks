'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { getArrowSectionVH } from '@/lib/arrow-section-progress'

// ─── Speed lines: appear AS arrow fades (no gap) ────────────────────
const FADE_IN_START = 2.5
const FADE_IN_END = 3.5
const HIDE_VH = 18.0

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.998, 1.0);
}
`

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform float uScroll;
uniform float uOpacity;
uniform float uDensity;
uniform vec2  uResolution;

varying vec2 vUv;

#define PI  3.14159265359
#define TAU 6.28318530718

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

// ── Single starburst layer ──────────────────────────────────────────
float starburstLayer(
  vec2 uv, float dist, float angle,
  float numSlots, float seed, float density,
  float scroll, float time
) {
  // Fluid wave distortion along radial lines
  float waveDistort = sin(dist * 14.0 - time * 1.5 + seed * 3.14) * 0.035;
  float slotNorm = (angle + waveDistort + PI) / TAU;
  float slotFloat = slotNorm * numSlots;
  float slotIdx = floor(slotFloat) + seed * 1000.0;
  float slotFrac = fract(slotFloat);

  float h1 = hash(slotIdx * 1.17);
  float h2 = hash(slotIdx * 2.31);
  float h3 = hash(slotIdx * 3.47);
  float h4 = hash(slotIdx * 4.63);
  float h5 = hash(slotIdx * 5.79);

  // Density threshold controls how many lines are visible
  float threshold = mix(0.85, 0.30, density);
  float hasLine = step(threshold, h1);

  // Line properties — chunky streaks (thickness is fraction of slot width)
  float thickness = 0.20 + h2 * 0.40;
  float lineLen = 0.15 + h3 * 0.35;

  // Staggered start points (leaves center empty, lines appear at various depths)
  float innerR = 0.10;
  float lineStart = innerR + h4 * 0.8;

  // Scroll-driven rush: lines stream outward (no idle drift)
  float speed = 0.25 + h5 * 0.75;
  float rush = scroll * speed * 1.2;
  float drift = 0.0;

  float animStart = mod(lineStart + rush + drift, 2.0);
  animStart = max(animStart, innerR);
  float animEnd = animStart + lineLen;

  // Angular mask — line body
  float angleMask = smoothstep(thickness, thickness * 0.25, abs(slotFrac - 0.5) * 2.0) * hasLine;

  // Radial mask
  float distMask = smoothstep(animStart, animStart + 0.02, dist)
                 * (1.0 - smoothstep(animEnd - 0.02, animEnd, dist));

  return angleMask * distMask;
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uResolution.x / uResolution.y;

  float angle = atan(uv.y, uv.x);
  float dist  = length(uv);

  // ── Layer 1: primary thick lines (120 slots) ──
  float layer1 = starburstLayer(uv, dist, angle, 120.0, 0.0, uDensity, uScroll, uTime);

  // ── Layer 2: secondary thinner lines, offset rotation (90 slots) ──
  float layer2 = starburstLayer(uv, dist, angle + 0.015, 90.0, 1.0, uDensity * 0.85, uScroll * 1.1, uTime);

  // ── Layer 3: fine detail lines (70 slots) ──
  float layer3 = starburstLayer(uv, dist, angle - 0.01, 70.0, 2.0, uDensity * 0.6, uScroll * 0.9, uTime);

  // ── Ambient Jaipur Sky background with fluid waves ──
  float bgWave1 = sin(dist * 16.0 - angle * 4.0 - uScroll * 1.2 + uTime * 0.8) * 0.5 + 0.5;
  float bgWave2 = cos(dist * 28.0 + angle * 6.0 + uScroll * 1.8 - uTime * 0.6) * 0.5 + 0.5;
  float bgWave3 = sin((uv.x + uv.y) * 14.0 + uTime * 0.5) * 0.5 + 0.5;
  float waveMix = (bgWave1 * 0.45 + bgWave2 * 0.38 + bgWave3 * 0.17);
  waveMix = smoothstep(0.08, 0.92, waveMix);

  vec3 bgWaveDark   = vec3(0.015, 0.005, 0.012);
  vec3 bgWavePink   = vec3(0.24, 0.04, 0.13) * waveMix;
  vec3 bgWaveOrange = vec3(0.32, 0.09, 0.04) * pow(waveMix, 1.8);
  vec3 bgColor      = bgWaveDark + (bgWavePink + bgWaveOrange) * uOpacity * 0.9;

  // ── Color per-pixel (Jaipur Pink Sky & Sunset Orange Accents) ──
  float cs = fract(angle * 2.7 + dist * 3.1);

  vec3 jaipurPink  = vec3(0.96, 0.42, 0.58); // Pinkish sky of Jaipur (replaces cyan)
  vec3 deepRose    = vec3(0.88, 0.28, 0.50); // Deep rose sky (replaces blue)
  vec3 twilight    = vec3(0.72, 0.18, 0.55); // Sunset twilight purple-magenta
  vec3 warmMagenta = vec3(0.90, 0.22, 0.65); // Warm pink magenta
  vec3 orangeSky   = vec3(1.00, 0.64, 0.32); // Sunset Orange Accent (replaces white)
  vec3 peachGlint  = vec3(1.00, 0.78, 0.45); // Peach orange highlight

  vec3 color1 = mix(jaipurPink, deepRose, smoothstep(0.15, 0.30, cs));
  color1 = mix(color1, twilight, smoothstep(0.35, 0.55, cs));
  color1 = mix(color1, warmMagenta, smoothstep(0.60, 0.75, cs));
  color1 = mix(color1, orangeSky, smoothstep(0.85, 0.95, cs));

  // Layer 2 gets a slightly shifted palette with peach orange highlights
  float cs2 = fract(cs + 0.33);
  vec3 color2 = mix(deepRose, jaipurPink, smoothstep(0.2, 0.4, cs2));
  color2 = mix(color2, orangeSky, smoothstep(0.5, 0.7, cs2));
  color2 = mix(color2, peachGlint, smoothstep(0.85, 0.95, cs2));

  // Layer 3: rich Jaipur pink & warm orange accents
  float cs3 = fract(cs + 0.66);
  vec3 color3 = mix(jaipurPink, deepRose, smoothstep(0.3, 0.6, cs3));
  color3 = mix(color3, orangeSky, smoothstep(0.7, 0.9, cs3));

  // ── Combine layers ──
  vec3 lineContrib = color1 * layer1 * 1.0
                   + color2 * layer2 * 0.7
                   + color3 * layer3 * 0.45;

  // Subtle glow halo on layer 1
  float glowMask = starburstLayer(uv, dist, angle, 120.0, 0.0, min(uDensity + 0.15, 1.0), uScroll, uTime);
  lineContrib += color1 * glowMask * 0.15;

  // ── Minimal vignette — let lines reach edges ──
  float vignette = 1.0 - smoothstep(0.8, 2.0, dist);

  vec3 finalColor = bgColor + lineContrib * vignette;

  gl_FragColor = vec4(finalColor, uOpacity);
}
`

export function RadialSpeedLines() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const { size } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uOpacity: { value: 0 },
      uDensity: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
    }),
    [size],
  )

  useFrame((state) => {
    if (!materialRef.current || !meshRef.current) return

    const aVH = getArrowSectionVH()

    const opacity =
      aVH < FADE_IN_START
        ? 0
        : aVH > HIDE_VH
          ? 0
          : Math.min(1, (aVH - FADE_IN_START) / (FADE_IN_END - FADE_IN_START))

    if (opacity < 0.001) {
      meshRef.current.visible = false
      return
    }
    meshRef.current.visible = true

    // Density ramps from 0 → 1 over 4vh
    const density = Math.max(0, Math.min(1, (aVH - FADE_IN_END) / 4.0))

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    materialRef.current.uniforms.uScroll.value = Math.max(0, aVH - FADE_IN_START)
    materialRef.current.uniforms.uOpacity.value = opacity
    materialRef.current.uniforms.uDensity.value = density
    materialRef.current.uniforms.uResolution.value.set(size.width, size.height)
  })

  return (
    <mesh ref={meshRef} renderOrder={0} visible={false}>
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
