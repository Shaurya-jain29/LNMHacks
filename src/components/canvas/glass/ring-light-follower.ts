export function createRingLightFollower() {
  const defaultLight = { x: 4, y: 9 }
  const radius = Math.hypot(defaultLight.x, defaultLight.y)
  const defaultAngle = Math.atan2(defaultLight.y, defaultLight.x)
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
    if (inside && mappedX * mappedX + mappedY * mappedY > 1e-6) {
      targetAngle = Math.atan2(mappedY, mappedX)
    } else if (!inside) {
      targetAngle = defaultAngle
    }

    // Cinematic slow damping factor (0.7) for relaxed, gentle ring light tracking
    currentAngle = dampAngle(currentAngle, targetAngle, 0.7, delta)
    return {
      x: radius * Math.cos(currentAngle),
      y: radius * Math.sin(currentAngle),
    }
  }
}
