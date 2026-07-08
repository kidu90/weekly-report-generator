import { useMemo } from 'react'
import { format } from 'date-fns'
import { DatePicker } from './DatePicker'
import { getWeekRange } from '@/lib/dates'

interface WeekRangePickerProps {
  weekStart?: Date
  weekEndDate?: Date
  onChange: (weekStart: Date, weekEndDate: Date) => void
}

export function WeekRangePicker({ weekStart, weekEndDate, onChange }: WeekRangePickerProps) {
  const label = useMemo(() => {
    if (!weekStart || !weekEndDate) {
      return 'Pick a date to auto-fill the week range'
    }

    return `${format(weekStart, 'PPP')} - ${format(weekEndDate, 'PPP')}`
  }, [weekStart, weekEndDate])

  return (
    <div className="space-y-2">
      <DatePicker
        value={weekStart}
        onChange={(date) => {
          if (!date) {
            return
          }

          const range = getWeekRange(date)
          onChange(range.weekStart, range.weekEndDate)
        }}
        placeholder="Choose a week start date"
      />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}