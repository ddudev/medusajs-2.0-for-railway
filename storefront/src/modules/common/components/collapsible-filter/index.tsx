'use client'

import { useState } from 'react'
import { Typography, Box } from '@mui/material'
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material'

type CollapsibleFilterProps = {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  "data-testid"?: string
}

const CollapsibleFilter = ({
  title,
  children,
  defaultExpanded = false,
  "data-testid": dataTestId,
}: CollapsibleFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <Box
      data-testid={dataTestId}
      sx={{
        backgroundColor: 'background.paper',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Header - Clickable to toggle */}
      <Box
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': {
            backgroundColor: 'background.default',
          },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontWeight: 500,
            fontSize: '0.875rem',
          }}
        >
          {title}
        </Typography>
        {isExpanded ? (
          <KeyboardArrowUp sx={{ fontSize: '20px', color: 'text.secondary' }} />
        ) : (
          <KeyboardArrowDown sx={{ fontSize: '20px', color: 'text.secondary' }} />
        )}
      </Box>

      {/* Content - Shown when expanded */}
      {isExpanded && (
        <Box
          sx={{
            padding: '12px 16px',
            backgroundColor: 'background.elevated',
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  )
}

export default CollapsibleFilter
