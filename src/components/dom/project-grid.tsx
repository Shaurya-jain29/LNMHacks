'use client'

import { useEffect, useRef } from 'react'
import { domRegistry } from '@/lib/dom-registry'
import NoiseBackground from '@/components/ui/noise-dark-blue-gradient-with-squares'

const PROJECTS = [
  { id: 'proj-1', title: 'Cosmic Sequence', img1: '/projects/p1.svg', img2: '/projects/p2.svg' },
  { id: 'proj-2', title: 'Neon Horizon', img1: '/projects/p3.svg', img2: '/projects/p4.svg' },
  { id: 'proj-3', title: 'Void Synthesis', img1: '/projects/p5.svg', img2: '/projects/p6.svg' },
  { id: 'proj-4', title: 'Lunar Matrix', img1: '/projects/p7.svg', img2: '/projects/p8.svg' },
  { id: 'proj-5', title: 'Solar Flare', img1: '/projects/p9.svg', img2: '/projects/p10.svg' },
  { id: 'proj-6', title: 'Orbit Protocol', img1: '/projects/p11.svg', img2: '/projects/p12.svg' },
]

export function ProjectGrid() {
  const aboutImageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (aboutImageRef.current) domRegistry.register('about-image', aboutImageRef.current)
    return () => domRegistry.unregister('about-image')
  }, [])

  const onPointerEnter = () => domRegistry.setHover('about-image', true)
  const onPointerLeave = () => domRegistry.setHover('about-image', false)

  return (
    <div className="relative w-full">
      {/* Interactive Background Layer */}
      <NoiseBackground 
        showGrid={false}
        squareSize={11}
        hoverFillColor="rgba(231,114,139,1)"
        hoverStrokeColor="rgba(231,114,139,1)"
        hoverGlowColor="rgba(231,114,139,0.6)"
      />
      
      {/* Foreground Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-32 md:py-48 pointer-events-none">
        <div className="pointer-events-auto">
          {/* Intro / About Section */}
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24 mb-32 md:mb-48">
        {/* Image Placeholder */}
        <div className="w-full max-w-sm md:w-1/3 relative shrink-0">
          <div 
            ref={aboutImageRef}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            className="w-full aspect-square relative group block cursor-pointer"
          >
            {/* Invisible DOM placeholder to force exact layout matches for 3D shader */}
            <img src="/projects/p1.svg" alt="Placeholder" className="opacity-0 absolute inset-0 w-full h-full object-cover" />
            
            {/* Decorative Dot */}
            <div className="absolute bottom-6 right-6 w-3 h-3 bg-blue-600 pointer-events-none"></div>
          </div>
          
          {/* Decorative Signature Placeholder */}
          <div className="absolute -top-6 -left-6 md:-top-10 md:-left-8 text-blue-600 text-4xl md:text-6xl rotate-[-15deg] font-serif italic font-bold opacity-80 pointer-events-none" style={{ fontFamily: 'cursive' }}>
            Signature
          </div>
        </div>

        {/* Text Placeholder */}
        <div className="w-full md:w-2/3">
          <p className="text-2xl md:text-4xl lg:text-[2.75rem] font-medium text-slate-900 leading-[1.15] tracking-tight">
            [Placeholder Headline: I explore how to shape AI-era workflows with craft and taste, building the next generation of digital products.]
          </p>
          <p className="text-xl md:text-3xl text-slate-400 mt-6 md:mt-8 leading-[1.3] font-light">
            [Placeholder Subtitle: I'm building <span className="text-slate-600 border-b-2 border-slate-300 hover:border-slate-400 cursor-pointer transition-colors pb-1">Project 1</span>, and previously worked on <span className="text-slate-600 border-b-2 border-slate-300 hover:border-slate-400 cursor-pointer transition-colors pb-1">Company A</span>, <span className="text-slate-600 border-b-2 border-slate-300 hover:border-slate-400 cursor-pointer transition-colors pb-1">Company B</span>, and <span className="text-slate-600">Company C</span>.]
          </p>
        </div>
      </div>

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
      <div className="absolute -bottom-10 left-0 pointer-events-none">
        <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
          {project.title}
        </h3>
      </div>
    </a>
  )
}

export { PROJECTS }
