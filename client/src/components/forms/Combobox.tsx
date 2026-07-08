import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value?: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
  className?: string
  disabled?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  emptyLabel = 'No results found',
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredOptions = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase())),
    [options, search],
  )

  const selectedLabel = options.find((option) => option.value === value)?.label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn('w-full justify-between', className)} disabled={disabled}>
          <span className={cn('truncate', !selectedLabel && 'text-muted-foreground')}>
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} />
          </div>
        </div>
        <div className="max-h-72 overflow-auto p-1">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={cn('flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted', option.value === value && 'bg-muted')}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value ? <Check className="h-4 w-4" /> : null}
              </button>
            ))
          ) : (
            <div className="px-3 py-6 text-sm text-muted-foreground">{emptyLabel}</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}