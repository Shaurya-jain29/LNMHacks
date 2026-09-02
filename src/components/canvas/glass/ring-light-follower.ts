export function createRingLightFollower() {
  const radiusX = 2.6
  const radiusY = 1.35
  const defaultAngle = Math.PI * 0.35 // top-right default highlight
  let targetAngle = defaultAngle
  let currentAngle = defaultAngle

  const dampAngle = (current: number, target: number, lambda: number, dt: number) => {
    const shortest = Math.atan2(
      Math.sin(target - current),
      Math.cos(target - current),
    )
    return current + shortest * (1 - Math.exp(-lambda * dt))
  }

  // mappedX / mappedY come from raycasting pointer UV onto the model plane.
  return (mappedX: number, mappedY: number, inside: boolean, delta: number) => {
    if (inside && mappedX * mappedX + mappedY * mappedY > 1e-4) {
      targetAngle = Math.atan2(mappedY, mappedX)
    } else if (!inside) {
      targetAngle = defaultAngle
    }

    // Responsive, silky damping factor (5.5) for instant, fluid tracking
    currentAngle = dampAngle(currentAngle, targetAngle, 5.5, delta)
    return {
      x: radiusX * Math.cos(currentAngle),
      y: radiusY * Math.sin(currentAngle),
    }
  }
}
