'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { SortOptions } from "../sort-dropdown"

type MobileSortButtonProps = {
  "data-testid"?: string
}

const ChevronDownIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const MobileSortButton = ({
  "data-testid": dataTestId,
}: MobileSortButtonProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const sortBy = (searchParams.get("sortBy") as SortOptions) || "created_at"

  const sortOptions = useMemo(() => [
    {
      value: "created_at" as const,
      label: t("filters.latestArrivals"),
    },
    {
      value: "price_asc" as const,
      label: t("filters.priceLowToHigh"),
    },
    {
      value: "price_desc" as const,
      label: t("filters.priceHighToLow"),
    },
  ], [t])

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      params.delete("page")
      return params.toString()
    },
    [searchParams]
  )

  const handleToggle = () => {
    setOpen((prev) => !prev)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleSelect = (value: SortOptions) => {
    const query = createQueryString("sortBy", value)
    router.push(`${pathname}?${query}`, { scroll: false })
    handleClose()
  }

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose()
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center justify-center gap-2 w-full px-4 min-h-[48px] text-sm"
        data-testid={dataTestId}
        aria-label="Сортирай продукти"
        aria-expanded={open}
      >
        <span>Сортиране</span>
        <ChevronDownIcon />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 min-w-[200px] py-1 bg-background-elevated rounded-lg shadow-lg z-50 border border-border-base"
          role="menu"
        >
          {sortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full text-left px-4 py-3 text-[15px] transition-colors first:rounded-t-lg last:rounded-b-lg ${
                option.value === sortBy ? "bg-primary/20 font-medium hover:bg-primary/30" : ""
              }`}
              role="menuitem"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default MobileSortButton
