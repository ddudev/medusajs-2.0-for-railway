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
    <div className="flex flex-col gap-2" data-testid={dataTestId}>
      <span className="text-sm font-normal text-gray-600">{t("filters.sortBy")}:</span>
      <FormControl
        size="small"
        sx={{
          minWidth: 180,
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            color: '#1f2937',
            fontWeight: 400,
            fontSize: '0.875rem',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            '& fieldset': { border: 'none' },
            '&:hover fieldset': { border: 'none' },
            '&.Mui-focused fieldset': { border: 'none' },
            '&:hover': {
              backgroundColor: '#f9fafb',
              borderColor: '#9ca3af',
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
              padding: '9px 36px 9px 14px',
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: 'white',
                color: '#1f2937',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                borderRadius: '8px',
                marginTop: '6px',
                border: '1px solid #e5e7eb',
                '& .MuiMenuItem-root': {
                  fontSize: '0.875rem',
                  padding: '10px 16px',
                  fontWeight: 400,
                },
                '& .MuiMenuItem-root:hover': {
                  bgcolor: '#f3f4f6',
                },
                '& .Mui-selected': {
                  bgcolor: '#e5e7eb !important',
                  fontWeight: 500,
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

