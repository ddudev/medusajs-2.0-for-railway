import { Suspense } from "react"
import SearchModalWrapper from "./search-modal-wrapper"
import SuspenseLoading from "@modules/common/components/suspense-loading"

export default function SearchModalRoute() {
  return (
    <Suspense fallback={<SuspenseLoading />}>
      <SearchModalWrapper />
    </Suspense>
  )
}
