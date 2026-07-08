import { CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: Date
  onChange: (date?: Date) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', className, disabled, minDate, maxDate }: DatePickerProps) {
  const disabledDays = minDate && maxDate ? [{ before: minDate, after: maxDate }] : minDate ? { before: minDate } : maxDate ? { after: maxDate } : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('w-full justify-start gap-2 text-left font-normal', !value && 'text-muted-foreground', className)} disabled={disabled}>
          <CalendarDays className="h-4 w-4" />
          {value ? format(value, 'PPP') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => onChange(date)}
          disabled={disabledDays}
        />
      </PopoverContent>
    </Popover>
  )
}