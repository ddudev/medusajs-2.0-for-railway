'use client'

import { useSearchParams } from "next/navigation"
import FilterCheckboxGroup from "@modules/common/components/filter-checkbox-group"
import CollapsibleFilter from "@modules/common/components/collapsible-filter"
import { HttpTypes } from "@medusajs/types"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

type FilterCollectionProps = {
  collections: HttpTypes.StoreCollection[]
  setQueryParamsArray: (name: string, values: string[]) => void
  "data-testid"?: string
  darkMode?: boolean
}

const FilterCollection = ({
  collections,
  setQueryParamsArray,
  "data-testid": dataTestId,
  darkMode = false,
}: FilterCollectionProps) => {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  // Get all collection values from URL (can be multiple)
  const selectedCollectionIds = searchParams.getAll("collection").filter(Boolean)

  const handleChange = (value: string, checked: boolean) => {
    if (value === "") {
      // "All Collections" - clear all selections
      setQueryParamsArray("collection", [])
      return
    }

    let newValues: string[]
    if (checked) {
      // Add to selection
      newValues = [...selectedCollectionIds, value]
    } else {
      // Remove from selection
      newValues = selectedCollectionIds.filter((id) => id !== value)
    }

    setQueryParamsArray("collection", newValues)
  }

  const items = [
    ...collections.map((collection) => ({
      value: collection.id,
      label: collection.title || collection.handle,
    })),
  ]

  // Don't render if no collections
  if (!items || items.length === 0) {
    return null
  }

  // Default expanded if there are selected collections
  const defaultExpanded = selectedCollectionIds.length > 0

  return (
    <CollapsibleFilter
      title={t("filters.collection")}
      defaultExpanded={defaultExpanded}
      data-testid={dataTestId}
      darkMode={darkMode}
    >
      <FilterCheckboxGroup
        items={items}
        selectedValues={selectedCollectionIds}
        handleChange={handleChange}
        darkMode={darkMode}
      />
    </CollapsibleFilter>
  )
}

export default FilterCollection



