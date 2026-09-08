'use client'

import { useRef, useEffect } from 'react'
import { subscribeLenisScroll } from '@/lib/scroll-bus'
import { getArrowSectionVH } from '@/lib/arrow-section-progress'

// ─── 4 text phases — all appear AFTER speed lines are visible ────────
const TEXT_PHASES = [
  {
    lines: ['INNOVATE', 'WITH', 'PURPOSE'],
    fadeIn: 4.5,
    fadeInEnd: 5.0,
    fadeOutStart: 6.5,
    fadeOut: 7.0,
  },
  {
    lines: ['BUILD', 'THE', 'FUTURE'],
    fadeIn: 7.0,
    fadeInEnd: 7.5,
    fadeOutStart: 9.0,
    fadeOut: 9.5,
  },
  {
    lines: ['PUSH', 'EVERY', 'BOUNDARY'],
    fadeIn: 9.5,
    fadeInEnd: 10.0,
    fadeOutStart: 11.5,
    fadeOut: 12.0,
  },
  {
    lines: ['CREATE', 'REAL', 'IMPACT'],
    fadeIn: 12.0,
    fadeInEnd: 12.5,
    fadeOutStart: 14.0,
    fadeOut: 14.5,
  },
]

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function InnovateSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRefs = useRef<(HTMLHeadingElement | null)[]>([])

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return

      const aVH = getArrowSectionVH()

      let anyVisible = false

      for (let i = 0; i < TEXT_PHASES.length; i++) {
        const phase = TEXT_PHASES[i]
        const el = textRefs.current[i]
        if (!el) continue

        const fadeIn = smoothstep(phase.fadeIn, phase.fadeInEnd, aVH)
        const fadeOut = 1 - smoothstep(phase.fadeOutStart, phase.fadeOut, aVH)
        const opacity = fadeIn * fadeOut

        if (opacity > 0.001) {
          anyVisible = true
          el.style.opacity = String(opacity)
          el.style.display = 'block'

          const scaleIn = 0.88 + fadeIn * 0.12
          const scaleHold = aVH > phase.fadeInEnd
            ? 1.0 + smoothstep(phase.fadeInEnd, phase.fadeOut, aVH) * 0.03
            : scaleIn
          el.style.transform = `scale(${scaleHold})`
        } else {
          el.style.opacity = '0'
          el.style.display = 'none'
        }
      }

      containerRef.current.style.visibility = anyVisible ? 'visible' : 'hidden'
    }

    update()
    return subscribeLenisScroll(update)
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center"
      style={{ visibility: 'hidden' }}
    >
      {TEXT_PHASES.map((phase, i) => (
        <h1
          key={i}
          ref={(el) => { textRefs.current[i] = el }}
          className="absolute text-center font-black tracking-tight leading-[0.92] select-none"
          style={{
            fontSize: 'clamp(2.5rem, 10vw, 8rem)',
            color: 'rgba(255, 255, 255, 0.95)',
            textShadow:
              '0 0 60px rgba(100, 180, 255, 0.25), 0 0 120px rgba(80, 40, 150, 0.15)',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            letterSpacing: '-0.04em',
            opacity: 0,
            display: 'none',
          }}
        >
          {phase.lines.map((line, j) => (
            <span key={j}>
              {line}
              {j < phase.lines.length - 1 && <br />}
            </span>
          ))}
        </h1>
      ))}
    </div>
  )
}
