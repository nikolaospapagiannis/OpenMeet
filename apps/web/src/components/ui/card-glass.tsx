import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Glassmorphism card variants using class-variance-authority
 * Supports multiple depth levels and hover states
 */
const cardGlassVariants = cva(
  "rounded-xl lg:rounded-2xl backdrop-blur-xl transition-all duration-300 relative",
  {
    variants: {
      variant: {
        default:
          "bg-slate-900/50 dark:bg-slate-900/50 border border-white/10 dark:border-white/10 shadow-2xl shadow-black/20 " +
          "light:bg-white/70 light:border-slate-200/50 light:shadow-slate-200/20",
        elevated:
          "bg-slate-900/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/20 shadow-2xl shadow-teal-500/10 " +
          "light:bg-white/80 light:border-slate-300/50 light:shadow-teal-500/5",
        subtle:
          "bg-slate-900/30 dark:bg-slate-900/30 border border-white/5 dark:border-white/5 " +
          "light:bg-white/50 light:border-slate-200/30",
        gradient:
          "bg-gradient-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60 border border-white/15 " +
          "shadow-2xl shadow-purple-500/10 light:from-white/80 light:via-white/60 light:to-white/80",
      },
      hover: {
        true:
          "hover:bg-white/10 dark:hover:bg-white/10 hover:border-teal-500/50 dark:hover:border-teal-500/50 " +
          "hover:scale-[1.02] hover:shadow-2xl hover:shadow-teal-500/20 cursor-pointer " +
          "light:hover:bg-white/90 light:hover:border-teal-500/30 light:hover:shadow-teal-500/10",
        false: "",
      },
      padding: {
        sm: "p-4",
        md: "p-6 lg:p-8",
        lg: "p-8 lg:p-12",
        xl: "p-10 lg:p-16",
        none: "",
      },
      gradient: {
        true: "before:absolute before:inset-0 before:rounded-xl before:p-[1px] before:bg-gradient-to-br before:from-teal-500/50 before:to-purple-500/50 before:-z-10",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      hover: false,
      padding: "md",
      gradient: false,
    },
  }
)

/**
 * CardGlass component props
 */
export interface CardGlassProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardGlassVariants> {
  asChild?: boolean
}

/**
 * Glassmorphism Card Component
 * Creates beautiful glass effect cards with backdrop blur
 */
const CardGlass = React.forwardRef<HTMLDivElement, CardGlassProps>(
  ({ className, variant, hover, padding, gradient, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardGlassVariants({ variant, hover, padding, gradient }), className)}
      {...props}
    />
  )
)
CardGlass.displayName = "CardGlass"

/**
 * Card Header component for glassmorphism cards
 */
const CardGlassHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 pb-6",
      "border-b border-white/10 dark:border-white/10",
      "light:border-slate-200/50",
      className
    )}
    {...props}
  />
))
CardGlassHeader.displayName = "CardGlassHeader"

/**
 * Card Title component
 */
const CardGlassTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-semibold text-xl lg:text-2xl leading-none tracking-tight",
      "text-slate-900 dark:text-white",
      "light:text-slate-900",
      className
    )}
    {...props}
  />
))
CardGlassTitle.displayName = "CardGlassTitle"

/**
 * Card Description component
 */
const CardGlassDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm lg:text-base",
      "text-slate-500 dark:text-slate-400",
      "light:text-slate-600",
      className
    )}
    {...props}
  />
))
CardGlassDescription.displayName = "CardGlassDescription"

/**
 * Card Content component
 */
const CardGlassContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("pt-6", className)}
    {...props}
  />
))
CardGlassContent.displayName = "CardGlassContent"

/**
 * Card Footer component
 */
const CardGlassFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center pt-6",
      "border-t border-white/10 dark:border-white/10",
      "light:border-slate-200/50",
      className
    )}
    {...props}
  />
))
CardGlassFooter.displayName = "CardGlassFooter"

export {
  CardGlass,
  CardGlassHeader,
  CardGlassFooter,
  CardGlassTitle,
  CardGlassDescription,
  CardGlassContent,
}