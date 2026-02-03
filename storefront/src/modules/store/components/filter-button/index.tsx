"use client"

import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { Funnel } from "@medusajs/icons"
import { Badge } from "@/components/ui/badge"
import { useFilterContext } from "@modules/store/templates/store-template-client"

type FilterButtonProps = {
  "data-testid"?: string
}

const FilterButton = ({ "data-testid": dataTestId }: FilterButtonProps) => {
  const searchParams = useSearchParams()
  const { openFilterDrawer } = useFilterContext()

  const activeFilterCount = useMemo(() => {
    let count = 0
    const collectionIds = searchParams.getAll("collection").filter(Boolean)
    const categoryIds = searchParams.getAll("category").filter(Boolean)
    const brandIds = searchParams.getAll("brand").filter(Boolean)
    const priceRange = searchParams.get("price")

    count += collectionIds.length
    count += categoryIds.length
    count += brandIds.length
    if (priceRange) count += 1

    return count
  }, [searchParams])

  return (
    <button
      onClick={openFilterDrawer}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors relative group"
      data-testid={dataTestId}
      aria-label="Open filters"
    >
      <span className="text-sm font-medium text-text-tertiary">Филтрирай:</span>
      <Funnel className="w-5 h-5 text-white/80 group-hover:text-white" />
      <span className="text-sm font-semibold text-white">Всички</span>

      {activeFilterCount > 0 && (
        <Badge
          variant="default"
          className="absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 text-[0.75rem] flex items-center justify-center rounded-full"
        >
          {activeFilterCount}
        </Badge>
      )}
    </button>
  )
}

export default FilterButton

