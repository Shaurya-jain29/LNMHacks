'use client'

import { useEffect, useRef } from 'react'
import { domRegistry } from '@/lib/dom-registry'

const PROJECTS = [
  { id: 'proj-1', title: 'Cosmic Sequence', img1: '/projects/p1.svg', img2: '/projects/p2.svg' },
  { id: 'proj-2', title: 'Neon Horizon', img1: '/projects/p3.svg', img2: '/projects/p4.svg' },
  { id: 'proj-3', title: 'Void Synthesis', img1: '/projects/p5.svg', img2: '/projects/p6.svg' },
  { id: 'proj-4', title: 'Lunar Matrix', img1: '/projects/p7.svg', img2: '/projects/p8.svg' },
  { id: 'proj-5', title: 'Solar Flare', img1: '/projects/p9.svg', img2: '/projects/p10.svg' },
  { id: 'proj-6', title: 'Orbit Protocol', img1: '/projects/p11.svg', img2: '/projects/p12.svg' },
]

export function ProjectGrid() {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-32 md:py-48">
      <div className="mb-16">
        <span className="text-xs uppercase tracking-widest text-blue-600 font-semibold">Featured Work</span>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mt-2">Selected Projects</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32">
        {PROJECTS.map((p, i) => (
          <ProjectCard key={p.id} project={p} index={i} />
        ))}
      </div>
    </div>
  )
}

function ProjectCard({ project, index }: { project: any, index: number }) {
  const ref = useRef<HTMLAnchorElement>(null)
  
  useEffect(() => {
    if (ref.current) domRegistry.register(project.id, ref.current)
    return () => domRegistry.unregister(project.id)
  }, [project.id])

  const onPointerEnter = () => domRegistry.setHover(project.id, true)
  const onPointerLeave = () => domRegistry.setHover(project.id, false)

  return (
    <a 
      ref={ref}
      href={`#${project.id}`}
      className={`group block relative w-full aspect-[4/3] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 ${index % 2 === 1 ? 'md:mt-24' : ''}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {/* Invisible DOM placeholders for layout & accessibility */}
      <span className="sr-only">View project: {project.title}</span>
      <img src={project.img1} alt={project.title} className="opacity-0 absolute inset-0 w-full h-full object-cover" />
      
      {/* DOM-based text/titles */}
      <div className="absolute -bottom-10 left-0">
        <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
          {project.title}
        </h3>
      </div>
    </a>
  )
}

export { PROJECTS }
