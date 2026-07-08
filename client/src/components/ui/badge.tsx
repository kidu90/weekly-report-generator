import * as React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  outline: 'border border-border text-foreground',
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  destructive: 'bg-destructive/15 text-destructive',
}

export function Badge({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant }) {
  return <div className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', variants[variant], className)} {...props} />
}