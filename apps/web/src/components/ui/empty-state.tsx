import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

/**
 * Empty State Props
 */
export interface EmptyStateProps {
  icon?: LucideIcon | React.ComponentType<any>
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'gradient' | 'outline'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  variant?: 'info' | 'error' | 'success' | 'no-data' | 'warning'
  className?: string
  size?: 'sm' | 'md' | 'lg'
  image?: string | React.ReactNode
}

/**
 * Empty State Component
 * Displays a friendly message when there's no content to show
 * Includes icon, title, description, and optional CTA
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'info',
  className,
  size = 'md',
  image
}: EmptyStateProps) {
  // Variant-based icon colors
  const iconColors = {
    info: 'text-cyan-400 dark:text-cyan-400',
    error: 'text-rose-400 dark:text-rose-400',
    success: 'text-emerald-400 dark:text-emerald-400',
    'no-data': 'text-slate-400 dark:text-slate-400',
    warning: 'text-amber-400 dark:text-amber-400',
  }

  // Variant-based background colors for icon container
  const iconBackgrounds = {
    info: 'bg-cyan-500/10 dark:bg-cyan-500/10',
    error: 'bg-rose-500/10 dark:bg-rose-500/10',
    success: 'bg-emerald-500/10 dark:bg-emerald-500/10',
    'no-data': 'bg-slate-500/10 dark:bg-slate-500/10',
    warning: 'bg-amber-500/10 dark:bg-amber-500/10',
  }

  // Size configurations
  const sizeConfigs = {
    sm: {
      container: 'py-8 px-4',
      iconWrapper: 'w-12 h-12',
      icon: 'w-6 h-6',
      title: 'text-lg',
      description: 'text-sm',
      maxWidth: 'max-w-sm'
    },
    md: {
      container: 'py-12 px-4',
      iconWrapper: 'w-16 h-16',
      icon: 'w-8 h-8',
      title: 'text-xl',
      description: 'text-base',
      maxWidth: 'max-w-md'
    },
    lg: {
      container: 'py-16 px-6',
      iconWrapper: 'w-20 h-20',
      icon: 'w-10 h-10',
      title: 'text-2xl lg:text-3xl',
      description: 'text-lg',
      maxWidth: 'max-w-lg'
    }
  }

  const sizeConfig = sizeConfigs[size]

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizeConfig.container,
        className
      )}
    >
      {/* Custom Image or Icon */}
      {image ? (
        typeof image === 'string' ? (
          <img
            src={image}
            alt={title}
            className="mb-6 opacity-75"
            style={{ maxHeight: size === 'lg' ? '200px' : '150px' }}
          />
        ) : (
          <div className="mb-6">{image}</div>
        )
      ) : Icon && (
        <div
          className={cn(
            "rounded-full flex items-center justify-center mb-6",
            "backdrop-blur-sm",
            "border border-white/10 dark:border-white/10",
            "light:border-slate-200/50",
            sizeConfig.iconWrapper,
            iconBackgrounds[variant],
            // Add subtle animation
            "transition-all duration-300 hover:scale-110"
          )}
        >
          <Icon className={cn(sizeConfig.icon, iconColors[variant])} />
        </div>
      )}

      {/* Title */}
      <h3
        className={cn(
          "font-semibold mb-2",
          "text-slate-900 dark:text-white",
          "light:text-slate-900",
          sizeConfig.title
        )}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className={cn(
          "mb-8",
          "text-slate-500 dark:text-slate-400",
          "light:text-slate-600",
          sizeConfig.description,
          sizeConfig.maxWidth
        )}
      >
        {description}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          {/* Primary Action */}
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                "px-6 py-3 rounded-lg font-medium transition-all duration-300",
                action.variant === 'gradient'
                  ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-105 active:scale-95"
                  : action.variant === 'outline'
                  ? "border border-white/10 dark:border-white/10 text-slate-900 dark:text-white hover:bg-white/5 dark:hover:bg-white/5"
                  : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100"
              )}
            >
              {action.label}
            </button>
          )}

          {/* Secondary Action */}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className={cn(
                "px-6 py-3 rounded-lg font-medium transition-all duration-300",
                "text-slate-600 dark:text-slate-400",
                "hover:text-slate-900 dark:hover:text-white",
                "hover:underline underline-offset-4"
              )}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Pre-configured empty state patterns
 */

/**
 * No Results Empty State
 */
export function NoResultsEmptyState({
  onReset,
  className
}: {
  onReset?: () => void
  className?: string
}) {
  return (
    <EmptyState
      title="No results found"
      description="We couldn't find anything matching your search. Try adjusting your filters or search terms."
      action={
        onReset
          ? {
              label: "Clear filters",
              onClick: onReset,
              variant: 'outline'
            }
          : undefined
      }
      variant="no-data"
      className={className}
    />
  )
}

/**
 * Error Empty State
 */
export function ErrorEmptyState({
  onRetry,
  className,
  message = "Something went wrong while loading this content. Please try again."
}: {
  onRetry?: () => void
  className?: string
  message?: string
}) {
  return (
    <EmptyState
      title="Unable to load content"
      description={message}
      action={
        onRetry
          ? {
              label: "Try again",
              onClick: onRetry,
              variant: 'gradient'
            }
          : undefined
      }
      variant="error"
      className={className}
    />
  )
}

/**
 * Coming Soon Empty State
 */
export function ComingSoonEmptyState({
  feature,
  className
}: {
  feature?: string
  className?: string
}) {
  return (
    <EmptyState
      title="Coming Soon"
      description={`${feature ? `${feature} is` : "This feature is"} currently under development. Check back soon for updates!`}
      variant="info"
      className={className}
    />
  )
}

/**
 * First Time User Empty State
 */
export function WelcomeEmptyState({
  onGetStarted,
  entityName = "items",
  className
}: {
  onGetStarted?: () => void
  entityName?: string
  className?: string
}) {
  return (
    <EmptyState
      title={`No ${entityName} yet`}
      description={`Get started by creating your first ${entityName.slice(0, -1)}. It only takes a few seconds!`}
      action={
        onGetStarted
          ? {
              label: `Create ${entityName.slice(0, -1)}`,
              onClick: onGetStarted,
              variant: 'gradient'
            }
          : undefined
      }
      variant="no-data"
      size="lg"
      className={className}
    />
  )
}