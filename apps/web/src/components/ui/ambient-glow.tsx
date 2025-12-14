import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Glow configuration type
 */
interface GlowConfig {
  color: string
  size: string
  position: string
  animation?: string
  blur?: string
}

/**
 * Predefined glow configurations for different variants
 */
const glowConfigurations: Record<string, GlowConfig[]> = {
  default: [
    {
      color: "bg-teal-500/10",
      size: "w-96 h-96",
      position: "top-0 left-1/4",
      animation: "animate-pulse",
      blur: "blur-[120px]"
    },
    {
      color: "bg-cyan-500/10",
      size: "w-96 h-96",
      position: "bottom-0 right-1/4",
      animation: "animate-pulse delay-1000",
      blur: "blur-[120px]"
    },
    {
      color: "bg-purple-500/5",
      size: "w-[500px] h-[500px]",
      position: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
      blur: "blur-[150px]"
    },
  ],
  hero: [
    {
      color: "bg-gradient-to-br from-teal-500/20 to-cyan-500/20",
      size: "w-[600px] h-[600px]",
      position: "top-[-10%] right-[-5%]",
      animation: "animate-pulse",
      blur: "blur-[200px]"
    },
    {
      color: "bg-gradient-to-tr from-purple-500/15 to-indigo-500/15",
      size: "w-[700px] h-[700px]",
      position: "bottom-[-20%] left-[-10%]",
      animation: "animate-pulse delay-2000",
      blur: "blur-[200px]"
    },
    {
      color: "bg-teal-600/10",
      size: "w-[400px] h-[400px]",
      position: "top-1/3 left-1/3",
      blur: "blur-[150px]"
    },
  ],
  dashboard: [
    {
      color: "bg-teal-500/5",
      size: "w-80 h-80",
      position: "top-10 left-10",
      blur: "blur-[100px]"
    },
    {
      color: "bg-cyan-500/5",
      size: "w-80 h-80",
      position: "top-10 right-10",
      blur: "blur-[100px]"
    },
    {
      color: "bg-purple-500/3",
      size: "w-96 h-96",
      position: "bottom-10 left-1/2 -translate-x-1/2",
      blur: "blur-[120px]"
    },
  ],
  minimal: [
    {
      color: "bg-slate-500/5",
      size: "w-[800px] h-[800px]",
      position: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
      blur: "blur-[200px]"
    },
  ],
  vibrant: [
    {
      color: "bg-gradient-to-br from-pink-500/15 to-rose-500/15",
      size: "w-[500px] h-[500px]",
      position: "top-0 left-0",
      animation: "animate-pulse",
      blur: "blur-[150px]"
    },
    {
      color: "bg-gradient-to-bl from-blue-500/15 to-cyan-500/15",
      size: "w-[500px] h-[500px]",
      position: "top-0 right-0",
      animation: "animate-pulse delay-1000",
      blur: "blur-[150px]"
    },
    {
      color: "bg-gradient-to-tr from-purple-500/15 to-violet-500/15",
      size: "w-[500px] h-[500px]",
      position: "bottom-0 left-0",
      animation: "animate-pulse delay-2000",
      blur: "blur-[150px]"
    },
    {
      color: "bg-gradient-to-tl from-emerald-500/15 to-teal-500/15",
      size: "w-[500px] h-[500px]",
      position: "bottom-0 right-0",
      animation: "animate-pulse delay-3000",
      blur: "blur-[150px]"
    },
  ]
}

/**
 * Props for the AmbientGlow component
 */
export interface AmbientGlowProps {
  variant?: keyof typeof glowConfigurations
  className?: string
  intensity?: 'low' | 'medium' | 'high'
  animate?: boolean
  custom?: GlowConfig[]
}

/**
 * Ambient Glow Background Component
 * Creates beautiful ambient lighting effects with colored glows
 * Zero performance impact using CSS only
 */
export function AmbientGlow({
  variant = "default",
  className,
  intensity = 'medium',
  animate = true,
  custom
}: AmbientGlowProps) {
  // Use custom glows if provided, otherwise use variant configuration
  const glows = custom || glowConfigurations[variant] || glowConfigurations.default

  // Intensity modifiers
  const intensityModifiers = {
    low: 'opacity-30',
    medium: 'opacity-50',
    high: 'opacity-70'
  }

  return (
    <div
      className={cn(
        "fixed inset-0 overflow-hidden pointer-events-none -z-10",
        intensityModifiers[intensity],
        className
      )}
      aria-hidden="true"
    >
      {glows.map((glow, index) => (
        <div
          key={index}
          className={cn(
            "absolute rounded-full",
            glow.size,
            glow.color,
            glow.position,
            glow.blur || "blur-[120px]",
            animate && glow.animation,
            // Add will-change for better performance
            "will-change-transform"
          )}
          style={{
            // Add delay for staggered animations
            animationDelay: `${index * 1000}ms`
          }}
        />
      ))}

      {/* Optional: Add noise texture for more depth */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

/**
 * Animated Glow Orb Component
 * Individual glow orb that can be positioned independently
 */
export function GlowOrb({
  color = "bg-teal-500/10",
  size = "w-96 h-96",
  position = "top-0 left-0",
  className,
  animate = true
}: {
  color?: string
  size?: string
  position?: string
  className?: string
  animate?: boolean
}) {
  return (
    <div
      className={cn(
        "absolute rounded-full blur-[120px]",
        size,
        color,
        position,
        animate && "animate-pulse",
        className
      )}
      aria-hidden="true"
    />
  )
}