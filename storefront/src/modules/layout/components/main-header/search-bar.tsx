"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import dynamic from "next/dynamic"
import { SEARCH_INDEX_NAME, searchClient } from "@lib/search-client"
import { useRouter } from "next/navigation"
import { ChangeEvent, FormEvent } from "react"

// Lazy load InstantSearch and hooks only when needed
const InstantSearch = dynamic(
  () => import("react-instantsearch-hooks-web").then((mod) => mod.InstantSearch),
  { ssr: false }
)

const SearchBarContent = dynamic(
  () => import("./search-bar-content"),
  { ssr: false }
)

// Debounce utility
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Inner component that uses InstantSearch hooks
const SearchBarContentWrapper = ({
  isSearchActive,
  setIsSearchActive,
  isExpanded,
  setIsExpanded,
  onClose,
}: {
  isSearchActive: boolean
  setIsSearchActive: (active: boolean) => void
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
  onClose?: () => void
}) => {
  const { t } = useTranslation()
  const router = useRouter()
  const [searchValue, setSearchValue] = useState("")
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce search value to reduce API calls (300ms delay)
  const debouncedSearchValue = useDebounce(searchValue, 300)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.currentTarget.value)
  }

  const handleReset = () => {
    setSearchValue("")
    inputRef.current?.focus()
  }

  const handleSubmit = (e?: FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    if (searchValue) {
      router.push(`/results/${searchValue}`)
      setIsSearchActive(false)
      inputRef.current?.blur()
    }
  }

  const handleFocus = () => {
    setIsSearchActive(true)
    setIsExpanded(true)
  }

  const handleIconClick = () => {
    setIsExpanded(true)
    // Focus input after a small delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay blur to allow click events on results
    setTimeout(() => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(document.activeElement)
      ) {
        setIsSearchActive(false)
      }
    }, 200)
  }

  return (
    <>
      {/* Mobile: Icon button when not expanded */}
      {!isExpanded && (
        <button
          type="button"
          onClick={handleIconClick}
          className="md:hidden p-2 text-text-secondary hover:text-primary transition-colors"
          aria-label={t("common.searchPlaceholder") || "Search"}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      )}

      {/* Search input form - hidden on mobile when not expanded, always visible on desktop */}
      <form
        onSubmit={handleSubmit}
        className={`relative ${!isExpanded ? "hidden md:block" : "block"} ${isExpanded ? "w-full md:w-auto" : ""
          }`}
      >
        <div className="relative flex items-center gap-2 md:gap-2">
          <input
            ref={inputRef}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder={t("common.searchPlaceholder") || "Търсете в магазина"}
            spellCheck={false}
            type="search"
            value={searchValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={`flex-1 h-16 md:h-16 px-6 rounded-lg border-2 border-border-base focus:border-primary focus:outline-none text-text-primary placeholder:text-text-tertiary bg-background-base text-lg ${isExpanded
              ? "pr-16 md:pr-12 shadow-lg md:shadow-none"
              : "pr-12 md:pr-12"
              }`}
          />
          {/* Buttons inside input (clear and search) - hidden on mobile */}
          <div className="hidden md:flex absolute right-2 items-center gap-2">
            {searchValue && (
              <button
                onClick={handleReset}
                type="button"
                className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
                aria-label={t("search.clear")}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            <button
              type="submit"
              className="p-2 text-text-secondary hover:text-primary transition-colors"
              aria-label={t("search.submit")}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
          {/* Mobile close button - only shown when expanded */}
          {isExpanded && (
            <button
              type="button"
              onClick={() => {
                setSearchValue("")
                setIsExpanded(false)
                setIsSearchActive(false)
                onClose?.()
              }}
              className="md:hidden p-2 text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
              aria-label="Close search"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Only load InstantSearch when search is active and user has typed something */}
      {isSearchActive && debouncedSearchValue && (
        <InstantSearch
          indexName={SEARCH_INDEX_NAME}
          searchClient={searchClient}
        >
          <SearchBarContent
            query={debouncedSearchValue}
            onClose={() => setIsSearchActive(false)}
          />
        </InstantSearch>
      )}
    </>
  )
}

const SearchBar = () => {
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [topPosition, setTopPosition] = useState(0)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const headerRowRef = useRef<HTMLElement | null>(null)

  // Close search on escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isSearchActive) {
        setIsSearchActive(false)
        const input = searchContainerRef.current?.querySelector("input")
        if (input) {
          input.blur()
        }
      }
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [isSearchActive])

  // Disable body scroll when search is active
  useEffect(() => {
    if (isSearchActive) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isSearchActive])

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSearchActive &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchActive(false)
        // On mobile, also collapse the search input
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setIsExpanded(false)
        }
      }
    }

    if (isSearchActive) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [isSearchActive])

  // Handle window resize - if desktop, always show search
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth >= 768) {
          setIsExpanded(true)
        } else if (!isSearchActive) {
          setIsExpanded(false)
        }
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize)
      // Set initial state
      handleResize()
      return () => window.removeEventListener("resize", handleResize)
    }
  }, [isSearchActive])

  // Calculate top position for fixed search on mobile
  useEffect(() => {
    if (isExpanded && typeof window !== "undefined" && window.innerWidth < 768) {
      const headerRow = document.getElementById("header-bottom-row")
      if (headerRow) {
        const rect = headerRow.getBoundingClientRect()
        setTopPosition(rect.top)
      }
    }
  }, [isExpanded])

  return (
    <>
      {/* Backdrop overlay when search is active - only on mobile when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-[48] md:hidden"
          onClick={() => {
            setIsSearchActive(false)
            setIsExpanded(false)
          }}
        />
      )}

      {/* Search Container */}
      <div
        ref={searchContainerRef}
        className={`md:relative z-40 md:z-[51] ${isExpanded
          ? "fixed md:relative left-0 md:left-auto right-0 md:right-auto w-screen md:w-auto px-6 md:px-0 z-[51] md:z-[51]"
          : "relative w-full"
          }`}
        style={isExpanded && typeof window !== "undefined" && window.innerWidth < 768 ? {
          top: `${topPosition}px`,
        } : {}}
      >
        <SearchBarContentWrapper
          isSearchActive={isSearchActive}
          setIsSearchActive={setIsSearchActive}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          onClose={() => {
            setIsExpanded(false)
            setIsSearchActive(false)
          }}
        />
      </div>
    </>
  )
}

export default SearchBar
