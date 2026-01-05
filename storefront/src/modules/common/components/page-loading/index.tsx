import Spinner from "@modules/common/icons/spinner"

/**
 * Page-level loading component
 * Shows a centered spinner with message
 * Used in Next.js loading.tsx files for route transitions
 */
export default function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Spinner size="48" className="text-primary" />
      <p className="text-base-regular text-ui-fg-subtle">Loading...</p>
    </div>
  )
}
