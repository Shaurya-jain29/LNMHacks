'use client'

import { useEffect, useRef } from 'react'
import { domRegistry } from '@/lib/dom-registry'

const PROJECTS = [
  { id: 'proj-1', title: 'Cosmic Sequence', img1: 'https://picsum.photos/1024/768?random=1', img2: 'https://picsum.photos/1024/768?random=2' },
  { id: 'proj-2', title: 'Neon Horizon', img1: 'https://picsum.photos/1024/768?random=3', img2: 'https://picsum.photos/1024/768?random=4' },
  { id: 'proj-3', title: 'Void Synthesis', img1: 'https://picsum.photos/1024/768?random=5', img2: 'https://picsum.photos/1024/768?random=6' },
  { id: 'proj-4', title: 'Lunar Matrix', img1: 'https://picsum.photos/1024/768?random=7', img2: 'https://picsum.photos/1024/768?random=8' },
  { id: 'proj-5', title: 'Solar Flare', img1: 'https://picsum.photos/1024/768?random=9', img2: 'https://picsum.photos/1024/768?random=10' },
  { id: 'proj-6', title: 'Orbit Protocol', img1: 'https://picsum.photos/1024/768?random=11', img2: 'https://picsum.photos/1024/768?random=12' },
]

export function ProjectGrid() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-32 md:py-64">
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
      className={`group block relative w-full aspect-[4/3] rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-8 focus-visible:ring-offset-slate-900 ${index % 2 === 1 ? 'md:mt-32' : ''}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {/* Invisible DOM placeholders for screen readers / layout */}
      <span className="sr-only">View project: {project.title}</span>
      <img src={project.img1} alt={project.title} className="opacity-0 absolute inset-0 w-full h-full object-cover" />
      
      {/* DOM-based text/titles that sit on top or below */}
      <div className="absolute -bottom-10 left-0">
        <h3 className="text-xl font-medium text-white/80 group-hover:text-white transition-colors">
          {project.title}
        </h3>
      </div>
    </a>
  )
}

export { PROJECTS }
