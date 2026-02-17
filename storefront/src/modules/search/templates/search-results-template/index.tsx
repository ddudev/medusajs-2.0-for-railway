import { Heading, Text } from "@medusajs/ui"
import Link from "next/link"

import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SearchTracker from "@modules/search/components/search-tracker"

type SearchResultsTemplateProps = {
  query: string
  ids: string[]
  sortBy?: SortOptions
  page?: string
  countryCode: string
}

/** Wrapper that calls PaginatedProducts (returns object) and renders result.products so we don't render an object as React child. */
async function SearchResultsProducts({
  ids,
  sortBy,
  pageNumber,
  countryCode,
}: {
  ids: string[]
  sortBy?: SortOptions
  pageNumber: number
  countryCode: string
}) {
  const result = await PaginatedProducts({
    productsIds: ids,
    sortBy,
    page: pageNumber,
    countryCode,
  })
  return <>{result.products}</>
}

const SearchResultsTemplate = async ({
  query,
  ids,
  sortBy,
  page,
  countryCode,
}: SearchResultsTemplateProps) => {
  const pageNumber = page ? parseInt(page) : 1

  return (
    <>
      <SearchTracker query={query} resultsCount={ids.length} />
      <div className="flex justify-between border-b w-full py-6 px-8 small:px-14 items-center">
        <div className="flex flex-col items-start">
          <Text className="text-ui-fg-muted">Search Results for:</Text>
          <Heading>
            {decodeURI(query)} ({ids.length})
          </Heading>
        </div>
        <LocalizedClientLink
          href="/store"
          className="txt-medium text-ui-fg-subtle hover:text-ui-fg-base"
        >
          Clear
        </LocalizedClientLink>
      </div>
      <div className="flex flex-col small:flex-row small:items-start p-6">
        {ids.length > 0 ? (
          <>
            <RefinementList sortBy={sortBy || "created_at"} search />
            <div className="content-container">
              <SearchResultsProducts
                ids={ids}
                sortBy={sortBy}
                pageNumber={pageNumber}
                countryCode={countryCode}
              />
            </div>
          </>
        ) : (
          <Text className="ml-8 small:ml-14 mt-3">No results.</Text>
        )}
      </div>
    </>
  )
}

export default SearchResultsTemplate
