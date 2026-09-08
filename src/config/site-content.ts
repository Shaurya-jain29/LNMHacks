// ─── Centralized Site Content Config ─────────────────────────────────
// Easily edit text, titles, text phases, and background images here!

export interface TextPhase {
  lines: string[]
  fadeIn: number
  fadeInEnd: number
  fadeOutStart: number
  fadeOut: number
}

export interface ProjectItem {
  id: string
  title: string
  category: string
  bgImage?: string
  description?: string
}

export const SITE_CONTENT = {
  // ── Hero Section ──
  hero: {
    title: 'LNM Hacks 9.0',
    subtitle: 'Innovate with purpose',
    bgImage: '/hero-bg.jpg', // Replace with your custom background image URL or path
  },

  // ── 4 Text Phases (Scroll Arrow Section) ──
  textPhases: [
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
  ] as TextPhase[],

  // ── Project Grid / Card Background Images & Content ──
  projects: [
    {
      id: 'project-1',
      title: 'Neural Synthesizer',
      category: 'AI & Creative Tools',
      bgImage: '/images/project1-bg.jpg',
      description: 'Generative soundscapes powered by real-time neural models.',
    },
    {
      id: 'project-2',
      title: 'Spatial Canvas',
      category: 'Interactive WebGL',
      bgImage: '/images/project2-bg.jpg',
      description: '3D collaborative design environment in WebGL.',
    },
    {
      id: 'project-3',
      title: 'Autonomous Flow',
      category: 'Systems & Robotics',
      bgImage: '/images/project3-bg.jpg',
      description: 'Self-optimizing traffic & logistics network.',
    },
  ] as ProjectItem[],
}
