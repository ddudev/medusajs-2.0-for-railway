'use client'

import { Typography } from '@mui/material'
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import IconButton from '@mui/material/IconButton'

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
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
        {t("filters.noProductsFound")}
      </Typography>
    )
  }

  // Format: "200 резултата"
  const resultsText = `${totalCount} ${t("filters.results") || "резултата"}`

  return (
    <div className="flex items-center gap-4">
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
        {resultsText}
      </Typography>
      
      {/* Compact Pagination: < 1 / 6 > */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <IconButton
            size="small"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            sx={{ 
              padding: '4px',
              '&.Mui-disabled': {
                opacity: 0.5,
              },
            }}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </IconButton>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', minWidth: '40px', textAlign: 'center' }}>
            {currentPage} / {totalPages}
          </Typography>
          <IconButton
            size="small"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            sx={{ 
              padding: '4px',
              '&.Mui-disabled': {
                opacity: 0.5,
              },
            }}
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </IconButton>
        </div>
      )}
    </div>
  )
}

export default ProductCount

