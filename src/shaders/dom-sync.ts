export const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  // position is from a plane covering -1 to 1
  gl_Position = vec4(position, 1.0);
}
`

export const fragmentShader = `
uniform sampler2D map;
uniform sampler2D mapHover;
uniform vec4 uRect;
uniform float uHoverRevealProgress;
uniform float uDotPixelSize;
uniform vec2 uViewportPx;
uniform float uPolarityPositive;
uniform float uCurlStrength;

varying vec2 vUv;

vec2 applyCurl(vec2 screenUv) {
  float centered = 2.0 * screenUv.y - 1.0;
  float profile = 1.0 - sqrt(max(0.0, 1.0 - centered * centered)); // semicircular profile
  float uvScale = 1.0 - profile * uCurlStrength;
  float distortedX = (screenUv.x - 0.5) * uvScale + 0.5;
  return vec2(distortedX, screenUv.y);
}

vec3 applyPolarity(vec3 rgb) {
  float t = clamp(uPolarityPositive, 0.0, 1.0);
  return mix(1.0 - rgb, rgb, t);
}

vec4 revealHoverImage(vec2 screenUv) {
  vec2 localUv = (screenUv - uRect.xy) / uRect.zw;
  float rectWidthPx  = max(uRect.z * uViewportPx.x, 1.0);
  float rectHeightPx = max(uRect.w * uViewportPx.y, 1.0);

  vec2 viewportPx = max(uViewportPx, vec2(1.0));
  vec2 cellSizeUv = vec2(max(2.0, uDotPixelSize)) / viewportPx;
  vec2 cellUv = fract(screenUv / cellSizeUv);
  float squareDist = max(abs(cellUv.x - 0.5), abs(cellUv.y - 0.5));

  float rectAspect = rectWidthPx / rectHeightPx;
  vec2 centered = localUv * 2.0 - 1.0;
  centered.x *= rectAspect;
  float distToCenter = length(centered);
  float maxRadius = length(vec2(rectAspect, 1.0));
  float progress = clamp(uHoverRevealProgress, 0.0, 1.0);
  float radius = progress * (maxRadius + 0.12);
  float grow = 1.0 - smoothstep(radius - 0.12, radius + 0.12, distToCenter);
  grow *= step(0.0001, progress);

  float squareExtent = mix(0.0, 0.5, grow);
  float squareAa = max(fwidth(squareDist), 0.0001);
  float squareMask = 1.0 - smoothstep(squareExtent - squareAa, squareExtent + squareAa, squareDist);

  vec4 baseColor  = texture2D(map, clamp(localUv, 0.0, 1.0));
  vec4 hoverColor = texture2D(mapHover, clamp(localUv, 0.0, 1.0));
  vec4 color = mix(baseColor, hoverColor, squareMask);
  vec2 edge = min(localUv, 1.0 - localUv);
  color.a *= step(0.0, edge.x) * step(0.0, edge.y);
  return color;
}

void main() {
  vec2 curledUv = applyCurl(vUv);
  vec4 color = revealHoverImage(curledUv);
  
  if (color.a < 0.01) discard;
  
  color.rgb = applyPolarity(color.rgb);
  gl_FragColor = color;
}
`
