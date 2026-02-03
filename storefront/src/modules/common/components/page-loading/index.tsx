import TopLoadingBar from "@modules/common/components/top-loading-bar"

/**
 * Page-level loading: top bar + full-height spacer so content area never collapses.
 * Used in Next.js loading.tsx files for route transitions.
 */
export default function PageLoading() {
  return (
    <>
      <TopLoadingBar />
      <div className="min-h-full" aria-hidden />
    </>
  )
}
