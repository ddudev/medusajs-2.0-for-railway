'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FilterCheckboxGroupProps = {
  title?: string
  items: {
    value: string
    label: string
  }[]
  selectedValues: string[]
  handleChange: (value: string, checked: boolean) => void
  "data-testid"?: string
  darkMode?: boolean
}

const FilterCheckboxGroup = ({
  items,
  selectedValues,
  handleChange,
  "data-testid": dataTestId,
  darkMode = false,
}: FilterCheckboxGroupProps) => {
  return (
    <div className="flex flex-col" data-testid={dataTestId}>
      {items?.map((item) => {
        const isChecked = selectedValues.includes(item.value)
        return (
          <div
            key={item.value}
            className={cn(
              "flex items-center space-x-2 mb-1.5",
              darkMode && "text-white/90"
            )}
          >
            <Checkbox
              id={`filter-${item.value}`}
              checked={isChecked}
              onCheckedChange={(checked) => handleChange(item.value, !!checked)}
              className={cn(
                darkMode && "border-white/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              )}
            />
            <Label
              htmlFor={`filter-${item.value}`}
              className={cn(
                "text-[0.95rem] cursor-pointer",
                isChecked ? "font-medium" : "font-normal",
                darkMode
                  ? isChecked
                    ? "text-white/95"
                    : "text-white/70"
                  : isChecked
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Label>
          </div>
        )
      })}
    </div>
  )
}

export default FilterCheckboxGroup
