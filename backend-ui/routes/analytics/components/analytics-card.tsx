"use client"

import { Heading, Text, Skeleton } from "@medusajs/ui"

interface AnalyticsCardProps {
  title: string
  loading?: boolean
  error?: Error | null
  empty?: boolean
  emptyMessage?: string
  children: React.ReactNode
}

export function AnalyticsCard({
  title,
  loading,
  error,
  empty,
  emptyMessage = "No data for this date range",
  children,
}: AnalyticsCardProps) {
  return (
    <div className="my-4 rounded-xl border border-ui-border-base bg-ui-bg-base shadow-sm p-4 md:p-5 ring-1 ring-ui-border-base/50">
      <Heading level="h2" className="mb-4 text-ui-fg-base font-semibold">
        {title}
      </Heading>
      {loading && <Skeleton className="h-20 w-full rounded" />}
      {error && (
        <Text className="text-ui-fg-error text-sm">Error: {error.message}</Text>
      )}
      {!loading && !error && empty && (
        <Text size="small" className="text-ui-fg-muted">
          {emptyMessage}
        </Text>
      )}
      {!loading && !error && !empty && children}
    </div>
  )
}
