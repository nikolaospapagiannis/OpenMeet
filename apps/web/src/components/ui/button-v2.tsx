import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Button variants configuration using class-variance-authority
 * Includes gradient variants and glassmorphism styles
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform-gpu",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        // New gradient variants
        "gradient-primary":
          "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-105 active:scale-95",
        "gradient-secondary":
          "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105 active:scale-95",
        "glassmorphism":
          "bg-white/5 dark:bg-white/5 backdrop-blur-md border border-white/10 dark:border-white/10 text-slate-900 dark:text-white hover:bg-white/10 dark:hover:bg-white/10 hover:border-teal-500/50 dark:hover:border-teal-500/50",
        "ghost-glass":
          "bg-transparent text-slate-900 dark:text-white hover:bg-white/5 dark:hover:bg-white/5 border border-transparent hover:border-white/10 dark:hover:border-white/10",
      },
      size: {
        xs: "h-7 px-2 text-xs rounded",
        sm: "h-9 px-3 rounded-md",
        default: "h-10 px-4 py-2",
        lg: "h-11 px-8 rounded-md text-base",
        xl: "h-14 px-10 rounded-lg text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Loading spinner component for button loading state
 */
const LoadingSpinner = ({ className }: { className?: string }) => (
  <svg
    className={cn("animate-spin", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

/**
 * Button component props interface
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

/**
 * Enhanced Button Component with gradient variants and loading states
 * Supports all standard button props plus custom variants
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : "button"

    // Determine if button should be disabled
    const isDisabled = disabled || isLoading

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          isLoading && "cursor-wait",
          // Add responsive sizing
          size === "default" && "sm:h-10 md:h-11",
          size === "lg" && "sm:h-11 md:h-12 lg:h-14",
          size === "xl" && "sm:h-14 md:h-16",
          // Add hover transition effects for gradient variants
          (variant === "gradient-primary" || variant === "gradient-secondary") &&
            "transform transition-all duration-300 ease-out",
          // Add glassmorphism effects
          (variant === "glassmorphism" || variant === "ghost-glass") &&
            "backdrop-filter backdrop-saturate-150"
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {/* Left icon */}
        {leftIcon && !isLoading && (
          <span className="mr-2 -ml-1">{leftIcon}</span>
        )}

        {/* Loading spinner */}
        {isLoading && (
          <LoadingSpinner className="mr-2 h-4 w-4" />
        )}

        {/* Button content */}
        <span className={cn(
          "inline-flex items-center",
          isLoading && loadingText && "ml-2"
        )}>
          {isLoading && loadingText ? loadingText : children}
        </span>

        {/* Right icon */}
        {rightIcon && !isLoading && (
          <span className="ml-2 -mr-1">{rightIcon}</span>
        )}
      </Comp>
    )
  }
)

Button.displayName = "Button"

/**
 * Button Group Component for grouped buttons
 */
export const ButtonGroup = ({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <div className={cn(
      "inline-flex shadow-sm rounded-lg isolate",
      className
    )}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child

        return React.cloneElement(child as React.ReactElement<any>, {
          className: cn(
            (child as React.ReactElement<any>).props.className,
            index === 0 && "rounded-r-none",
            index === React.Children.count(children) - 1 && "rounded-l-none",
            index !== 0 && index !== React.Children.count(children) - 1 && "rounded-none",
            index !== 0 && "-ml-px"
          )
        })
      })}
    </div>
  )
}

export { Button, buttonVariants }