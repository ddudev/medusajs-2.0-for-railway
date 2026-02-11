"use client"

import { useState, useMemo } from "react"
import { Button, Text } from "@medusajs/ui"

const DEFAULT_PAGE_SIZE = 5

interface AnalyticsPaginatedListProps<T> {
  items: T[]
  pageSize?: number
  renderItem: (item: T, index: number) => React.ReactNode
  /** Optional label for the list, e.g. "regions" for "Showing 1–5 of 10 regions" */
  itemLabel?: string
  /** "list" = ul/li with list-disc, "badges" = flex wrap (no bullets) */
  listStyle?: "list" | "badges"
}

export function AnalyticsPaginatedList<T>({
  items,
  pageSize = DEFAULT_PAGE_SIZE,
  renderItem,
  itemLabel = "items",
  listStyle = "list",
}: AnalyticsPaginatedListProps<T>) {
  const [page, setPage] = useState(0)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages - 1)
  const start = currentPage * pageSize
  const pageItems = useMemo(
    () => items.slice(start, start + pageSize),
    [items, start, pageSize]
  )

  if (total === 0) return null

  const listContent =
    listStyle === "badges" ? (
      <div className="flex flex-wrap gap-2">
        {pageItems.map((item, i) => (
          <span key={start + i}>{renderItem(item, start + i)}</span>
        ))}
      </div>
    ) : (
      <ul className="list-disc list-inside space-y-1">
        {pageItems.map((item, i) => (
          <li key={start + i}>{renderItem(item, start + i)}</li>
        ))}
      </ul>
    )

  return (
    <div className="space-y-3">
      {listContent}
      {total > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-ui-border-base">
          <Text size="small" className="text-ui-fg-muted">
            Showing {start + 1}–{Math.min(start + pageSize, total)} of {total} {itemLabel}
          </Text>
          <div className="flex items-center gap-1">
            <Button
              size="small"
              variant="secondary"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="secondary"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
