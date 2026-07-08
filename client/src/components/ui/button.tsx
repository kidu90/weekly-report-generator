import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'default' | 'lg' | 'icon'
  asChild?: boolean
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-input bg-background hover:bg-muted',
  ghost: 'hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
}

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 rounded-md px-3 text-sm',
  default: 'h-10 rounded-md px-4 py-2',
  lg: 'h-11 rounded-md px-6 text-base',
  icon: 'h-10 w-10 rounded-md',
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'

export { Button }