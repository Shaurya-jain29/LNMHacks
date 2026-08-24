type Rect = { top: number; left: number; bottom: number; right: number; width: number; height: number }

export function createDomRectSampler() {
  const rects: Record<string, Rect> = {}
  let lastScrollTop = 0
  let frame = 0

  function isNearViewport(r: Rect, margin = 400) {
    return r.bottom > -margin && r.top < window.innerHeight + margin
  }

  function updateCachedRect(key: string, domRect: DOMRect) {
    rects[key] = {
      top: domRect.top, left: domRect.left, bottom: domRect.bottom, right: domRect.right,
      width: domRect.width, height: domRect.height,
    }
  }

  function tick(scrollTop: number, layers: { key: string; el: HTMLElement | null }[]) {
    const deltaY = scrollTop - lastScrollTop
    lastScrollTop = scrollTop

    for (const rect of Object.values(rects)) {
      rect.top -= deltaY
      rect.bottom -= deltaY
    }

    layers.forEach((layer, index) => {
      const previous = rects[layer.key]
      const nearViewport = !previous || isNearViewport(previous)
      const staggeredRefresh = frame % 12 === index % 12
      if (!nearViewport && !staggeredRefresh) return
      if (layer.el) updateCachedRect(layer.key, layer.el.getBoundingClientRect())
    })

    frame += 1
    return rects
  }

  return { tick, rects }
}
