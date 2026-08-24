type RegistryEntry = { el: HTMLElement; hovered: boolean }
const registry = new Map<string, RegistryEntry>()
const listeners = new Set<() => void>()

export const domRegistry = {
  register(key: string, el: HTMLElement) {
    registry.set(key, { el, hovered: false })
    listeners.forEach((l) => l())
  },
  unregister(key: string) {
    registry.delete(key)
    listeners.forEach((l) => l())
  },
  setHover(key: string, hovered: boolean) {
    const entry = registry.get(key)
    if (entry && entry.hovered !== hovered) {
      entry.hovered = hovered
      listeners.forEach((l) => l())
    }
  },
  getEntries() {
    return Array.from(registry.entries()).map(([key, entry]) => ({ key, ...entry }))
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }
}
