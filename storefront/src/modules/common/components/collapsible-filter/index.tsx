'use client'

import { useState } from 'react'
import { Typography, Box } from '@mui/material'
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material'

type CollapsibleFilterProps = {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  "data-testid"?: string
  darkMode?: boolean
}

const CollapsibleFilter = ({
  title,
  children,
  defaultExpanded = false,
  "data-testid": dataTestId,
  darkMode = false,
}: CollapsibleFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <Box
      data-testid={dataTestId}
      sx={{
        backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'background.paper',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'divider',
      }}
    >
      {/* Header - Clickable to toggle */}
      <Box
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': {
            backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'background.default',
          },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'text.secondary',
            fontWeight: 500,
            fontSize: '0.9375rem',
          }}
        >
          {title}
        </Typography>
        {isExpanded ? (
          <KeyboardArrowUp sx={{ fontSize: '20px', color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }} />
        ) : (
          <KeyboardArrowDown sx={{ fontSize: '20px', color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }} />
        )}
      </Box>

      {/* Content - Shown when expanded */}
      {isExpanded && (
        <Box
          sx={{
            padding: '12px 16px 16px',
            backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.2)' : 'background.elevated',
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  )
}

export default CollapsibleFilter
