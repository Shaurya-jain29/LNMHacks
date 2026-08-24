import * as THREE from 'three'

export function createCurlStrengthSampler() {
  let previousScrollY: number | null = null
  let activity = 0

  return (scrollY: number, delta: number) => {
    const dt = THREE.MathUtils.clamp(delta, 1 / 240, 0.1)
    const velocity = previousScrollY == null ? 0 : Math.abs(scrollY - previousScrollY) / dt
    previousScrollY = scrollY

    const target = THREE.MathUtils.clamp(velocity / 800, 0, 1)
    const tau = target > activity ? 0.025 : 0.175   // fast attack, slow release
    const alpha = 1 - Math.exp(-dt / tau)
    activity += (target - activity) * alpha

    return 0.06 * activity
  }
}
