'use client'

import { Checkbox, FormControlLabel, Typography } from '@mui/material'

type FilterCheckboxGroupProps = {
  title?: string // Optional now since CollapsibleFilter handles the title
  items: {
    value: string
    label: string
  }[]
  selectedValues: string[]
  handleChange: (value: string, checked: boolean) => void
  "data-testid"?: string
}

const FilterCheckboxGroup = ({
  title,
  items,
  selectedValues,
  handleChange,
  "data-testid": dataTestId,
}: FilterCheckboxGroupProps) => {
  return (
    <div className="flex flex-col" data-testid={dataTestId}>
      {items?.map((item) => {
        const isChecked = selectedValues.includes(item.value)
        return (
          <FormControlLabel
            key={item.value}
            control={
              <Checkbox
                checked={isChecked}
                onChange={(e) => handleChange(item.value, e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: isChecked ? 500 : 400,
                  color: isChecked ? 'text.primary' : 'text.secondary',
                }}
              >
                {item.label}
              </Typography>
            }
            sx={{
              margin: 0,
              marginBottom: '4px',
              '& .MuiFormControlLabel-label': {
                marginLeft: '8px',
              },
            }}
          />
        )
      })}
    </div>
  )
}

export default FilterCheckboxGroup

