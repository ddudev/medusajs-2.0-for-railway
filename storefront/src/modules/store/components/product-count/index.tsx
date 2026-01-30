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
    <div className="flex flex-row md:flex-col justify-between md:items-start w-full md:w-auto gap-2">

      {/* Total results - aligned with sort label when no pagination */}
      <Typography 
        variant="body2" 
        sx={{ 
          color: '#6b7280', 
          fontSize: '0.875rem', 
          fontWeight: 400,
          // Add top margin when no pagination to align with sort label
          marginTop: totalPages <= 1 ? '2px' : '0',
        }}
      >
        {resultsText}
      </Typography>

      {/* Pagination on top - only show if multiple pages */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <IconButton
            size="small"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            sx={{ 
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              minWidth: '36px',
              height: '36px',
              '&:hover': {
                backgroundColor: '#f9fafb',
                borderColor: '#9ca3af',
              },
              '&.Mui-disabled': {
                opacity: 0.3,
                backgroundColor: '#f9fafb',
                borderColor: '#e5e7eb',
              },
            }}
            aria-label="Previous page"
          >
            <ChevronLeft sx={{ fontSize: '20px', color: '#374151' }} />
          </IconButton>
          
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.primary', 
              fontSize: '1rem', 
              fontWeight: 400,
              minWidth: '60px',
              textAlign: 'center',
            }}
          >
            {currentPage} <span style={{ color: '#9ca3af' }}>/{totalPages}</span>
          </Typography>
          
          <IconButton
            size="small"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            sx={{ 
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              minWidth: '36px',
              height: '36px',
              '&:hover': {
                backgroundColor: '#f9fafb',
                borderColor: '#9ca3af',
              },
              '&.Mui-disabled': {
                opacity: 0.3,
                backgroundColor: '#f9fafb',
                borderColor: '#e5e7eb',
              },
            }}
            aria-label="Next page"
          >
            <ChevronRight sx={{ fontSize: '20px', color: '#374151' }} />
          </IconButton>
        </div>
      )}
      
    </div>
  )
}

export default ProductCount

