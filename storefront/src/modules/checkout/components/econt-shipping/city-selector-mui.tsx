'use client'

/**
 * Econt City Selector - searchable dropdown (Shadcn/Radix-free combobox)
 */

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { getEcontCities, type EcontCity } from '@lib/data/econt'
import { cn } from '@/lib/utils'

type CitySelectorMUIProps = {
  value: EcontCity | null
  onChange: (city: EcontCity | null) => void
  disabled?: boolean
}

function getOptionLabel(option: EcontCity | null): string {
  if (!option) return ''
  return `гр. ${option.name} [п.к.: ${option.post_code}${option.region ? ` област: ${option.region}` : ''}]`
}

export function CitySelectorMUI({ value, onChange, disabled }: CitySelectorMUIProps) {
  const [cities, setCities] = useState<EcontCity[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && cities.length === 0 && !loading) {
      loadCities()
    }
  }, [open])

  useEffect(() => {
    if (value) {
      setInputValue(getOptionLabel(value))
    } else {
      setInputValue('')
    }
  }, [value])

  const loadCities = async () => {
    setLoading(true)
    try {
      const data = await getEcontCities()
      setCities(data)
    } catch (error) {
      console.error('Failed to load cities:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCities = useMemo(() => {
    if (!inputValue.trim()) return cities.slice(0, 100)
    const searchLower = inputValue.toLowerCase()
    return cities.filter(
      (city) =>
        city.name.toLowerCase().includes(searchLower) ||
        city.post_code.includes(searchLower) ||
        (city.region && city.region.toLowerCase().includes(searchLower))
    ).slice(0, 100)
  }, [cities, inputValue])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (value) setInputValue(getOptionLabel(value))
        else setInputValue('')
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, value])

  const handleSelect = (city: EcontCity) => {
    onChange(city)
    setInputValue(getOptionLabel(city))
    setOpen(false)
  }

  const isOptionSelected = (city: EcontCity) =>
    value ? value.city_id === city.city_id : false

  return (
    <div className="w-full relative" ref={containerRef}>
      <Label htmlFor="econt-city" className="sr-only">
        Изберете град
      </Label>
      <div className="relative">
        <Input
          id="econt-city"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setOpen(true)
            if (!e.target.value) onChange(null)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Търсене на град..."
          disabled={disabled}
          className="w-full pr-9"
          autoComplete="off"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : null}
        </span>
      </div>
      {open && (
        <ul
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-md"
          role="listbox"
        >
          {filteredCities.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {loading ? 'Зареждане...' : 'Няма намерени градове'}
            </li>
          ) : (
            filteredCities.map((city) => (
              <li
                key={city.city_id}
                role="option"
                aria-selected={isOptionSelected(city)}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                  isOptionSelected(city) && 'bg-accent'
                )}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(city)
                }}
              >
                {getOptionLabel(city)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
