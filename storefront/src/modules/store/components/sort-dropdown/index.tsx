'use client'

import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { useCallback, useMemo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
      params.delete("page")
      return params.toString()
    },
    [searchParams]
  )

  const handleChange = (value: SortOptions) => {
    const query = createQueryString("sortBy", value)
    router.push(`${pathname}?${query}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-2" data-testid={dataTestId}>
      <span className="text-sm font-normal text-gray-600">{t("filters.sortBy")}:</span>
      <Select value={sortBy} onValueChange={handleChange}>
        <SelectTrigger className="min-w-[180px] h-9 rounded-lg border border-border bg-white text-foreground text-sm font-normal hover:bg-muted/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default SortDropdown
