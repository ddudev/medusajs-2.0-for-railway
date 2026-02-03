'use client'

import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ProductCountProps = {
  currentPage: number
  pageSize: number
  totalCount: number
  totalPages: number
}

const ProductCount = ({ currentPage, pageSize, totalCount, totalPages }: ProductCountProps) => {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    if (newPage === 1) {
      params.delete("page")
    } else {
      params.set("page", newPage.toString())
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  if (totalCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("filters.noProductsFound")}
      </p>
    )
  }

  const resultsText = `${totalCount} ${t("filters.results") || "резултата"}`

  return (
    <div className="flex flex-row md:flex-col justify-between md:items-start w-full md:w-auto gap-2">
      <p
        className={cn(
          "text-sm text-gray-500 font-normal",
          totalPages <= 1 && "mt-0.5"
        )}
      >
        {resultsText}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-9 w-9 min-w-9 rounded-lg border border-border bg-white hover:bg-muted/50 hover:border-muted-foreground/30 disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </Button>

          <span className="text-base font-normal text-foreground min-w-[60px] text-center">
            {currentPage} <span className="text-muted-foreground">/{totalPages}</span>
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-9 w-9 min-w-9 rounded-lg border border-border bg-white hover:bg-muted/50 hover:border-muted-foreground/30 disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default ProductCount
