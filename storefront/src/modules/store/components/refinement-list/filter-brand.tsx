'use client'

import { useSearchParams } from "next/navigation"
import FilterCheckboxGroup from "@modules/common/components/filter-checkbox-group"
import CollapsibleFilter from "@modules/common/components/collapsible-filter"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { Brand } from "@lib/data/brands"

type FilterBrandProps = {
  brands: Brand[]
  setQueryParamsArray: (name: string, values: string[]) => void
  "data-testid"?: string
}

const FilterBrand = ({
  brands,
  setQueryParamsArray,
  "data-testid": dataTestId,
}: FilterBrandProps) => {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  // Get all brand values from URL (can be multiple)
  const selectedBrandIds = searchParams.getAll("brand").filter(Boolean)

  const handleChange = (value: string, checked: boolean) => {
    let newValues: string[]
    if (checked) {
      // Add to selection
      newValues = [...selectedBrandIds, value]
    } else {
      // Remove from selection
      newValues = selectedBrandIds.filter((id) => id !== value)
    }

    setQueryParamsArray("brand", newValues)
  }

  const items = [
    ...(brands || []).map((brand) => ({
      value: brand.id,
      label: brand.name,
    })),
  ]

  // Don't render if no brands
  if (!items || items.length === 0) {
    return null
  }

  // Default expanded if there are selected brands
  const defaultExpanded = selectedBrandIds.length > 0

  return (
    <CollapsibleFilter
      title={t("filters.brand")}
      defaultExpanded={defaultExpanded}
      data-testid={dataTestId}
    >
      <FilterCheckboxGroup
        items={items}
        selectedValues={selectedBrandIds}
        handleChange={handleChange}
      />
    </CollapsibleFilter>
  )
}

export default FilterBrand

