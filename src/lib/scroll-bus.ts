import type Lenis from 'lenis'

type ScrollSnapshot = {
  scrollTop: number
  limit: number
  progress: number
  velocity: number
  direction: 1 | -1 | 0
  viewportHeight: number
}

let snapshot: ScrollSnapshot = { scrollTop: 0, limit: 0, progress: 0, velocity: 0, direction: 0, viewportHeight: 0 }
const listeners = new Set<() => void>()
let unbind: (() => void) | null = null

export const bindLenisScrollBus = (lenis: Lenis | null) => {
  unbind?.()
  unbind = null
  if (!lenis) return

  const onScroll = (e: { scroll: number; limit: number; progress: number; velocity: number; direction: 1 | -1 | 0 }) => {
    snapshot = {
      scrollTop: e.scroll,
      limit: e.limit,
      progress: e.progress,
      velocity: e.velocity,
      direction: e.direction,
      viewportHeight: window.innerHeight,
    }
    for (const l of listeners) l()
  }

  lenis.on('scroll', onScroll)
  unbind = () => lenis.off('scroll', onScroll)
  snapshot = { ...snapshot, scrollTop: lenis.scroll }
}

export const getLenisScrollSnapshot = () => snapshot
export const subscribeLenisScroll = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
