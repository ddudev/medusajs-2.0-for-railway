import TopLoadingBar from "@modules/common/components/top-loading-bar"

/**
 * Suspense fallback: small bar at top of page (no UI jump).
 * Used in Suspense boundaries for component loading.
 */
export default function SuspenseLoading() {
  return <TopLoadingBar />
}
