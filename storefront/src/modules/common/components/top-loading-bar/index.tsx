/**
 * Small loading bar fixed at the very top of the page.
 * Used for route transitions and Suspense fallbacks so the UI doesn't change during load.
 */
export default function TopLoadingBar() {
  return (
    <div
      className="fixed left-0 right-0 top-0 z-[100] h-1 overflow-hidden bg-border"
      role="progressbar"
      aria-valuenow={undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Loading"
    >
      <div className="h-full w-1/4 bg-primary animate-top-loading-bar" />
    </div>
  )
}
