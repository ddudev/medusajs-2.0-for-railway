'use client'

import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { useCallback, useMemo } from "react"
import { Select, MenuItem, FormControl, SelectChangeEvent } from '@mui/material'
import { KeyboardArrowDown } from '@mui/icons-material'
import { useTranslation } from "@lib/i18n/hooks/use-translation"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

type SortDropdownProps = {
  "data-testid"?: string
}

const SortDropdown = ({
  "data-testid": dataTestId,
}: SortDropdownProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
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
      // Reset to page 1 when sort changes
      params.delete("page")
      return params.toString()
    },
    [searchParams]
  )

  const handleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value as SortOptions
    const query = createQueryString("sortBy", value)
    router.push(`${pathname}?${query}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-2" data-testid={dataTestId}>
      <span className="text-sm font-medium text-text-tertiary">{t("filters.sortBy")}:</span>
      <FormControl
        size="small"
        sx={{
          minWidth: 150,
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.875rem',
            '& fieldset': { border: 'none' },
            '&:hover fieldset': { border: 'none' },
            '&.Mui-focused fieldset': { border: 'none' },
          },
          '& .MuiSelect-icon': {
            color: 'white',
          }
        }}
      >
        <Select
          value={sortBy}
          onChange={handleChange}
          displayEmpty
          IconComponent={KeyboardArrowDown}
          sx={{
            '& .MuiSelect-select': {
              padding: '4px 32px 4px 0px',
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: '#1a1a1a',
                color: 'white',
                '& .MuiMenuItem-root:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
                '& .Mui-selected': {
                  bgcolor: 'rgba(255,255,255,0.2) !important',
                },
              },
            },
          }}
        >
          {sortOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  )
}

export default SortDropdown

