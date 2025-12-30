"use client"

import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { Funnel } from "@medusajs/icons"
import { Badge } from "@mui/material"
import { useFilterContext } from "@modules/store/templates/store-template-client"

type FilterButtonProps = {
  "data-testid"?: string
}

const FilterButton = ({ "data-testid": dataTestId }: FilterButtonProps) => {
  const searchParams = useSearchParams()
  const { openFilterDrawer } = useFilterContext()

  // Count active filters
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
      className="md:hidden flex items-center gap-2 px-4 py-2 border border-border-base rounded-lg hover:bg-background-elevated transition-colors relative"
      data-testid={dataTestId}
      aria-label="Open filters"
    >
      <Funnel className="w-5 h-5 text-text-secondary" />
      <span className="text-sm font-medium text-text-primary">Филтри</span>
      {activeFilterCount > 0 && (
        <Badge
          badgeContent={activeFilterCount}
          color="primary"
          sx={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            "& .MuiBadge-badge": {
              fontSize: "0.75rem",
              minWidth: "18px",
              height: "18px",
              padding: "0 4px",
            },
          }}
        />
      )}
    </button>
  )
}

export default FilterButton

