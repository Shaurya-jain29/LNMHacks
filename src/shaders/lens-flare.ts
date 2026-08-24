export const lensFlareVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`

export const lensFlareFragmentShader = `
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uThreshold;
uniform float uStreakScale;
uniform vec3 uBgColor;

varying vec2 vUv;

float luma(vec3 color) { return dot(color, vec3(0.2126, 0.7152, 0.0722)); }

// Detect specular highlights: pixels that are significantly brighter
// or more saturated than the background
float brightMask(vec3 color) {
  // Distance from the background color — catches glass rim reflections
  float bgDist = length(color - uBgColor);
  // Also check raw luminance for pure white specular
  float luminance = luma(color);
  float specular = smoothstep(uThreshold, 1.0, luminance);
  float deviation = smoothstep(0.15, 0.5, bgDist);
  return max(specular, deviation * 0.4);
}

vec3 sampleBright(vec2 uv) {
  vec3 color = texture2D(tDiffuse, uv).rgb;
  return color * brightMask(color);
}

vec3 streak(vec2 direction) {
  vec3 result = vec3(0.0);
  for (int i = 1; i <= 8; i++) {
    float distancePx = float(i) * 1.5;
    float weight = 1.0 / (1.0 + distancePx * 0.22);
    weight *= weight;
    vec2 offset = direction * distancePx;
    result += sampleBright(vUv + offset) * weight;
    result += sampleBright(vUv - offset) * weight;
  }
  return result;
}

void main() {
  vec3 base = texture2D(tDiffuse, vUv).rgb;
  vec3 flare = base * brightMask(base) * 0.8;
  vec2 px = (1.0 / uResolution) * uStreakScale;
  
  // Three axes at 60° spacing → 6-pointed star
  flare += streak(vec2(0.0, px.y));
  flare += streak(vec2(px.x * 0.8660254,  px.y * 0.5));
  flare += streak(vec2(px.x * 0.8660254, -px.y * 0.5));
  
  // Additive composite, subtle
  gl_FragColor = vec4(base + flare * 0.3, 1.0);
}
`
