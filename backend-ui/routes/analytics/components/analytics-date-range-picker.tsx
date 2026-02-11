"use client"

import { useState, useMemo } from "react"
import { Button, Text, DatePicker } from "@medusajs/ui"
import { Popover } from "radix-ui"
import type { DateRange } from "../../../src/hooks/api/analytics"

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatRangeLabel(start: string, end: string): string {
  const s = new Date(start + "T12:00:00")
  const e = new Date(end + "T12:00:00")
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
}

const PRESETS: { label: string; getValue: () => DateRange }[] = (() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  return [
    { label: "Today", getValue: () => ({ start_date: toYMD(today), end_date: toYMD(today) }) },
    { label: "Yesterday", getValue: () => ({ start_date: toYMD(yesterday), end_date: toYMD(yesterday) }) },
    {
      label: "Last 7 days",
      getValue: () => {
        const start = new Date(today)
        start.setDate(start.getDate() - 6)
        return { start_date: toYMD(start), end_date: toYMD(today) }
      },
    },
    {
      label: "Last 30 days",
      getValue: () => {
        const start = new Date(today)
        start.setDate(start.getDate() - 29)
        return { start_date: toYMD(start), end_date: toYMD(today) }
      },
    },
    {
      label: "Last 90 days",
      getValue: () => {
        const start = new Date(today)
        start.setDate(start.getDate() - 89)
        return { start_date: toYMD(start), end_date: toYMD(today) }
      },
    },
    {
      label: "Last 365 days",
      getValue: () => {
        const start = new Date(today)
        start.setDate(start.getDate() - 364)
        return { start_date: toYMD(start), end_date: toYMD(today) }
      },
    },
    {
      label: "Last week",
      getValue: () => {
        const sun = new Date(today)
        sun.setDate(sun.getDate() - sun.getDay() - 7)
        const sat = new Date(sun)
        sat.setDate(sat.getDate() + 6)
        return { start_date: toYMD(sun), end_date: toYMD(sat) }
      },
    },
    {
      label: "Last month",
      getValue: () => {
        const end = new Date(today.getFullYear(), today.getMonth(), 0)
        const start = new Date(end.getFullYear(), end.getMonth(), 1)
        return { start_date: toYMD(start), end_date: toYMD(end) }
      },
    },
  ]
})()

function rangeEquals(a: DateRange, b: DateRange): boolean {
  return a.start_date === b.start_date && a.end_date === b.end_date
}

interface AnalyticsDateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function AnalyticsDateRangePicker({ value, onChange }: AnalyticsDateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [customStart, setCustomStart] = useState<Date | null>(null)
  const [customEnd, setCustomEnd] = useState<Date | null>(null)
  const [showCustom, setShowCustom] = useState(false)

  const displayLabel = useMemo(() => {
    const preset = PRESETS.find((p) => rangeEquals(p.getValue(), value))
    if (preset) return preset.label
    if (value.start_date && value.end_date) return formatRangeLabel(value.start_date, value.end_date)
    return "Select range"
  }, [value])

  const handlePresetSelect = (range: DateRange) => {
    onChange(range)
    setOpen(false)
    setShowCustom(false)
  }

  const openCustom = () => {
    setCustomStart(value.start_date ? new Date(value.start_date + "T12:00:00") : null)
    setCustomEnd(value.end_date ? new Date(value.end_date + "T12:00:00") : null)
    setShowCustom(true)
  }

  const handleApply = () => {
    if (customStart && customEnd && customStart <= customEnd) {
      onChange({ start_date: toYMD(customStart), end_date: toYMD(customEnd) })
      setOpen(false)
      setShowCustom(false)
    }
  }

  const handleCancel = () => {
    setShowCustom(false)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button size="small" variant="secondary" type="button">
          {displayLabel}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-auto min-w-[520px] max-w-[90vw] overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-base shadow-elevation-flyout"
        >
          <div className="flex max-h-[70vh]">
            <div className="flex flex-col border-r border-ui-border-base">
              <div className="p-2">
                <Text size="xsmall" className="text-ui-fg-muted px-2 py-1">
                  Presets
                </Text>
              </div>
              <ul className="overflow-y-auto p-1 min-w-[140px]">
                {PRESETS.map((preset) => {
                  const range = preset.getValue()
                  const isSelected = rangeEquals(range, value)
                  return (
                    <li key={preset.label}>
                      <button
                        type="button"
                        className={`txt-compact-small w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-ui-bg-base-hover focus:bg-ui-bg-base-pressed focus:outline-none ${
                          isSelected ? "bg-ui-bg-base-pressed text-ui-fg-base" : "text-ui-fg-base"
                        }`}
                        onClick={() => handlePresetSelect(range)}
                      >
                        {preset.label}
                      </button>
                    </li>
                  )
                })}
                <li>
                  <button
                    type="button"
                    className={`txt-compact-small w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-ui-bg-base-hover focus:bg-ui-bg-base-pressed focus:outline-none ${
                      showCustom ? "bg-ui-bg-base-pressed text-ui-fg-base" : "text-ui-fg-base"
                    }`}
                    onClick={openCustom}
                  >
                    Custom
                  </button>
                </li>
              </ul>
            </div>
            {showCustom && (
              <div className="flex flex-col p-4 min-w-[360px] w-[360px]">
                <Text size="xsmall" className="text-ui-fg-muted mb-3">
                  Custom range
                </Text>
                <div className="space-y-3">
                  <div>
                    <Text size="xsmall" className="text-ui-fg-muted mb-1 block">
                      From
                    </Text>
                    <DatePicker
                      value={customStart ?? undefined}
                      onChange={(d) => setCustomStart(d ?? null)}
                      minValue={customEnd ? new Date(customEnd.getTime() - 365 * 24 * 60 * 60 * 1000) : undefined}
                      maxValue={customEnd ?? undefined}
                    />
                  </div>
                  <div>
                    <Text size="xsmall" className="text-ui-fg-muted mb-1 block">
                      To
                    </Text>
                    <DatePicker
                      value={customEnd ?? undefined}
                      onChange={(d) => setCustomEnd(d ?? null)}
                      minValue={customStart ?? undefined}
                      maxValue={new Date()}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2 border-t border-ui-border-base pt-3">
                  <Button size="small" variant="secondary" type="button" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    type="button"
                    onClick={handleApply}
                    disabled={!customStart || !customEnd || customStart > customEnd}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
