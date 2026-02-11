"use client"

interface MicroBarProps {
  value: number
  max: number
  className?: string
}

export function MicroBar({ value, max, className = "" }: MicroBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div
      className={`h-1.5 rounded-full bg-ui-border-base overflow-hidden ${className}`}
      role="presentation"
      aria-hidden
    >
      <div
        className="h-full rounded-full bg-ui-fg-interactive"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
