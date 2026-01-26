'use client'

import { useSearchParams } from "next/navigation"
import FilterCheckboxGroup from "@modules/common/components/filter-checkbox-group"
import CollapsibleFilter from "@modules/common/components/collapsible-filter"
import { HttpTypes } from "@medusajs/types"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

type FilterCategoryProps = {
  categories: HttpTypes.StoreProductCategory[]
  setQueryParamsArray: (name: string, values: string[]) => void
  "data-testid"?: string
  darkMode?: boolean
}

const FilterCategory = ({
  categories,
  setQueryParamsArray,
  "data-testid": dataTestId,
  darkMode = false,
}: FilterCategoryProps) => {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  // Get all category values from URL (can be multiple)
  const selectedCategoryIds = searchParams.getAll("category").filter(Boolean)

  const handleChange = (value: string, checked: boolean) => {
    let newValues: string[]
    if (checked) {
      // Add to selection
      newValues = [...selectedCategoryIds, value]
    } else {
      // Remove from selection
      newValues = selectedCategoryIds.filter((id) => id !== value)
    }

    setQueryParamsArray("category", newValues)
  }

  const items = [
    ...categories.map((category) => ({
      value: category.id,
      label: category.name || category.handle,
    })),
  ]

  // Default expanded if there are selected categories
  const defaultExpanded = selectedCategoryIds.length > 0

  return (
    <CollapsibleFilter
      title={t("filters.category")}
      defaultExpanded={defaultExpanded}
      data-testid={dataTestId}
      darkMode={darkMode}
    >
      <FilterCheckboxGroup
        items={items}
        selectedValues={selectedCategoryIds}
        handleChange={handleChange}
        darkMode={darkMode}
      />
    </CollapsibleFilter>
  )
}

export default FilterCategory



