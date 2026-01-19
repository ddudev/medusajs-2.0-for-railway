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
    <div className="flex items-center gap-1" data-testid={dataTestId}>
      <span className="text-sm font-normal text-gray-600">{t("filters.sortBy")}:</span>
      <FormControl
        size="small"
        sx={{
          minWidth: 120,
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            color: '#1f2937',
            fontWeight: 500,
            fontSize: '0.875rem',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            '& fieldset': { border: 'none' },
            '&:hover fieldset': { border: 'none' },
            '&.Mui-focused fieldset': { border: 'none' },
            '&:hover': {
              backgroundColor: '#f9fafb',
            },
          },
          '& .MuiSelect-icon': {
            color: '#6b7280',
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
              padding: '6px 32px 6px 12px',
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: 'white',
                color: '#1f2937',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                borderRadius: '8px',
                '& .MuiMenuItem-root': {
                  fontSize: '0.875rem',
                },
                '& .MuiMenuItem-root:hover': {
                  bgcolor: '#f3f4f6',
                },
                '& .Mui-selected': {
                  bgcolor: '#e5e7eb !important',
                  '&:hover': {
                    bgcolor: '#d1d5db !important',
                  },
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

