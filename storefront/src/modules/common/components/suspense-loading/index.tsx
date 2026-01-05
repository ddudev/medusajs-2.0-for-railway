import Spinner from "@modules/common/icons/spinner"

/**
 * Suspense fallback component
 * Shows a centered spinner
 * Used in Suspense boundaries for component loading
 */
export default function SuspenseLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <Spinner size="32" className="text-primary" />
    </div>
  )
}
