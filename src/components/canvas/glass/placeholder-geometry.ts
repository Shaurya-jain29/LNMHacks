import * as THREE from 'three'

export function createPlaceholderGlassGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-1, -0.4)
  shape.lineTo(1, -0.4)
  shape.lineTo(1, 0.4)
  shape.lineTo(-1, 0.4)
  shape.closePath()

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 6,
    curveSegments: 24,
  })
}
