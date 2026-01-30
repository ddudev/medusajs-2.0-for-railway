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
  darkMode?: boolean
}

const FilterCheckboxGroup = ({
  title,
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
          <FormControlLabel
            key={item.value}
            control={
              <Checkbox
                checked={isChecked}
                onChange={(e) => handleChange(item.value, e.target.checked)}
                size="small"
                sx={{
                  color: darkMode ? 'rgba(255, 255, 255, 0.5)' : undefined,
                  '&.Mui-checked': {
                    color: darkMode ? '#ff6b35' : undefined,
                  },
                }}
              />
            }
            label={
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.95rem',
                  fontWeight: isChecked ? 500 : 400,
                  color: darkMode 
                    ? (isChecked ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)')
                    : (isChecked ? 'text.primary' : 'text.secondary'),
                }}
              >
                {item.label}
              </Typography>
            }
            sx={{
              margin: 0,
              marginBottom: '6px',
              '& .MuiFormControlLabel-label': {
                marginLeft: '6px',
              },
            }}
          />
        )
      })}
    </div>
  )
}

export default FilterCheckboxGroup

