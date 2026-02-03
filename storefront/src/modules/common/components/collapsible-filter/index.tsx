'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type CollapsibleFilterProps = {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  "data-testid"?: string
  darkMode?: boolean
}

const CollapsibleFilter = ({
  title,
  children,
  defaultExpanded = false,
  "data-testid": dataTestId,
  darkMode = false,
}: CollapsibleFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div
      data-testid={dataTestId}
      className={cn(
        "rounded-xl overflow-hidden border",
        darkMode
          ? "bg-white/5 border-white/10"
          : "bg-card border-border"
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-3.5 cursor-pointer select-none text-left",
          darkMode
            ? "hover:bg-white/[0.08]"
            : "hover:bg-muted/50"
          )}
      >
        <span
          className={cn(
            "text-base font-semibold",
            darkMode ? "text-white/90" : "text-muted-foreground"
          )}
        >
          {title}
        </span>
        {isExpanded ? (
          <ChevronUp className={cn("h-5 w-5", darkMode ? "text-white/70" : "text-muted-foreground")} />
        ) : (
          <ChevronDown className={cn("h-5 w-5", darkMode ? "text-white/70" : "text-muted-foreground")} />
        )}
      </button>

      {isExpanded && (
        <div
          className={cn(
            "px-4 pt-3 pb-4",
            darkMode ? "bg-black/20" : "bg-muted/30"
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default CollapsibleFilter
