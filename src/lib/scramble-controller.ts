const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'

class ScrambleController {
  private subscribers = new Map<string, (text: string) => void>()
  private timer: ReturnType<typeof setInterval> | null = null

  subscribe(id: string, targetText: string, onFrame: (text: string) => void, durationMs = 500) {
    const start = performance.now()
    const settleIndex = () => Math.floor(((performance.now() - start) / durationMs) * targetText.length)
    this.subscribers.set(id, () => {
      const settled = Math.min(settleIndex(), targetText.length)
      const scrambled = targetText
        .split('')
        .map((ch, i) => (i < settled || ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join('')
      onFrame(scrambled)
      if (settled >= targetText.length) this.unsubscribe(id)
    })
    this.ensureTicking()
  }

  unsubscribe(id: string) { this.subscribers.delete(id) }

  private ensureTicking() {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.subscribers.forEach((fn) => fn(''))
      if (this.subscribers.size === 0 && this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    }, 40) // shared 40ms tick, matching the article
  }
}

export const scrambleController = new ScrambleController()
