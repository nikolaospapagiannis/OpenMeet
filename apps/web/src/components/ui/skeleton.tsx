import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Skeleton component props
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'card' | 'circle' | 'rectangle' | 'button'
  width?: string | number
  height?: string | number
  rounded?: boolean
  shimmer?: boolean
}

/**
 * Skeleton Loading Component
 * Animated pulse skeleton loader matching glassmorphism aesthetic
 */
export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  rounded = true,
  shimmer = true,
  ...props
}: SkeletonProps) {
  const variants = {
    text: 'h-4 w-full rounded',
    card: 'h-48 w-full rounded-xl',
    circle: 'h-12 w-12 rounded-full',
    rectangle: 'h-32 w-full rounded-lg',
    button: 'h-10 w-24 rounded-md',
  }

  return (
    <div
      className={cn(
        // Base styles
        "relative overflow-hidden",
        "bg-slate-800/50 dark:bg-slate-800/50",
        "light:bg-slate-200/50",
        "backdrop-blur-sm",

        // Animation
        "animate-pulse",

        // Variant styles
        variants[variant],

        // Rounded corners
        rounded && "rounded-md",

        // Custom dimensions
        width && `w-[${width}]`,
        height && `h-[${height}]`,

        className
      )}
      style={{
        ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
        ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
      }}
      {...props}
    >
      {/* Shimmer effect overlay */}
      {shimmer && (
        <div
          className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          }}
        />
      )}
    </div>
  )
}

/**
 * Pre-built Card Skeleton Pattern
 * Complete card skeleton with multiple elements
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "space-y-4 p-6",
        "bg-slate-900/50 dark:bg-slate-900/50",
        "light:bg-white/70",
        "backdrop-blur-xl",
        "rounded-xl",
        "border border-white/10 dark:border-white/10",
        "light:border-slate-200/50",
        className
      )}
    >
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="text" className="w-3/4" />
        <Skeleton variant="text" className="w-1/2" />
      </div>

      {/* Content */}
      <Skeleton variant="rectangle" className="h-32" />

      {/* Footer */}
      <div className="flex gap-2">
        <Skeleton variant="button" />
        <Skeleton variant="button" />
      </div>
    </div>
  )
}

/**
 * Table Row Skeleton Pattern
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-white/10 dark:border-white/10 light:border-slate-200/50">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton variant="text" />
        </td>
      ))}
    </tr>
  )
}

/**
 * List Item Skeleton Pattern
 */
export function ListItemSkeleton({ showAvatar = true }: { showAvatar?: boolean }) {
  return (
    <div className="flex items-center space-x-4 p-4">
      {showAvatar && <Skeleton variant="circle" />}
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-3/4" />
        <Skeleton variant="text" className="w-1/2" />
      </div>
    </div>
  )
}

/**
 * Form Skeleton Pattern
 */
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" className="w-24 h-3" /> {/* Label */}
          <Skeleton className="h-10 w-full rounded-md" /> {/* Input */}
        </div>
      ))}
      <div className="flex gap-3">
        <Skeleton variant="button" className="w-24" />
        <Skeleton variant="button" className="w-24" />
      </div>
    </div>
  )
}

/**
 * Chart Skeleton Pattern
 */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "p-6",
        "bg-slate-900/50 dark:bg-slate-900/50",
        "light:bg-white/70",
        "backdrop-blur-xl",
        "rounded-xl",
        "border border-white/10 dark:border-white/10",
        "light:border-slate-200/50",
        className
      )}
    >
      {/* Chart Title */}
      <Skeleton variant="text" className="w-48 mb-4" />

      {/* Chart Area */}
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between w-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-8 h-3" />
          ))}
        </div>

        {/* Chart bars/lines */}
        <div className="ml-12 h-full flex items-end justify-around gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1"
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>

        {/* X-axis labels */}
        <div className="ml-12 mt-2 flex justify-around">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="w-8 h-3" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Add shimmer animation to Tailwind (needs to be added to tailwind.config.ts)
 * This is already included in the extended animations
 */