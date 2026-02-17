"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { getEcontOffices, type EcontOffice } from "@lib/data/econt"
import dynamic from "next/dynamic"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

// Dynamically import map component to avoid SSR issues
const MapComponent = dynamic(() => import("./office-map"), {
  ssr: false,
})

type OfficeSelectorProps = {
  cityId: number
  onOfficeSelect: (office: EcontOffice) => void
  selectedOfficeCode: string | null
}

const OfficeSelector: React.FC<OfficeSelectorProps> = ({
  cityId,
  onOfficeSelect,
  selectedOfficeCode,
}) => {
  const { t } = useTranslation()
  const [offices, setOffices] = useState<EcontOffice[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // Start as false, only true when actually loading
  const [error, setError] = useState<string | null>(null)

  // Track which cityId we've already fetched to prevent duplicate requests (React Strict Mode)
  const fetchedCityIdRef = useRef<number | null>(null)
  const isFetchingRef = useRef(false)

  // Fetch all offices for the city once - only if cityId is valid
  useEffect(() => {
    // Clear everything if no valid cityId
    if (!cityId || cityId <= 0 || !Number.isInteger(cityId)) {
      setOffices([])
      setIsLoading(false)
      setError(null)
      setSearchQuery("")
      setIsOpen(false)
      fetchedCityIdRef.current = null
      isFetchingRef.current = false
      return
    }

    // If offices array is empty but we think we fetched this city, reset the ref
    // This handles Fast Refresh state resets
    if (fetchedCityIdRef.current === cityId && offices.length === 0) {
      fetchedCityIdRef.current = null
    }

    // Skip if we've already fetched this city AND we have offices
    // This prevents refetching but allows retry if offices array is empty
    if (fetchedCityIdRef.current === cityId && offices.length > 0) {
      // If we already have offices for this city, ensure loading is false
      setIsLoading(false)
      isFetchingRef.current = false
      return
    }

    // If we're currently fetching, don't start another fetch
    if (isFetchingRef.current) {
      return
    }

    let cancelled = false
    const currentCityId = cityId // Capture cityId to check in async callback

    const fetchOffices = async () => {
      isFetchingRef.current = true
      try {
        setIsLoading(true)
        setError(null)
        setSearchQuery("") // Clear search
        setIsOpen(false) // Close dropdown
        
        const allOffices = await getEcontOffices(currentCityId)
        
        // Check if this effect is still valid (cityId hasn't changed)
        if (cancelled) {
          return
        }
        
        // Verify we're still working with the same cityId
        if (currentCityId !== cityId) {

          return
        }
        
        // Use functional updates to ensure state is set correctly
        setOffices(() => {
          return allOffices
        })
        fetchedCityIdRef.current = currentCityId
        setIsLoading(() => {
          return false
        })
        isFetchingRef.current = false
        
        // Auto-open dropdown when offices are loaded (if we have offices)
        if (allOffices.length > 0) {
          // Use setTimeout to ensure state updates are applied before opening
          setTimeout(() => {
            setIsOpen(true)
          }, 0)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load offices")
          console.error("Error fetching offices:", err)
          setOffices([])
          setIsLoading(false)
          isFetchingRef.current = false
        }
      }
    }

    fetchOffices()

    // Cleanup: cancel request if cityId changes
    return () => {
      cancelled = true
      isFetchingRef.current = false
      // Don't clear offices or loading state here - only cancel the in-flight request
      // The new effect will handle state if cityId actually changed
    }
  }, [cityId, offices.length]) // Include offices.length to detect Fast Refresh state resets

  // Filter offices locally based on search query
  const filteredOffices = useMemo(() => {
    if (!searchQuery.trim()) {
      return offices
    }

    const query = searchQuery.toLowerCase().trim()
    return offices.filter((office) => {
      const name = office.name?.toLowerCase() || ""
      const nameEn = office.name_en?.toLowerCase() || ""
      const address = office.address?.toLowerCase() || ""
      const officeCode = office.office_code?.toLowerCase() || ""

      return (
        name.includes(query) ||
        nameEn.includes(query) ||
        address.includes(query) ||
        officeCode.includes(query)
      )
    })
  }, [offices, searchQuery])

  const selectedOffice = offices.find(
    (o) => o.office_code === selectedOfficeCode
  )

  const handleOfficeClick = (office: EcontOffice) => {
    onOfficeSelect(office)
    setIsOpen(false)
    setSearchQuery("")
  }

  // Don't render if no valid cityId - this is the first check
  if (!cityId || cityId <= 0 || !Number.isInteger(cityId)) {
    return null
  }

  // Get offices with coordinates for map
  const officesWithCoords = offices.filter(
    (o) => o.latitude && o.longitude
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("checkout.econt.officeRequired")}
        </label>
        <div className="text-sm text-gray-500">{t("checkout.econt.loadingOffices")}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("checkout.econt.officeRequired")}
        </label>
      <div className="text-sm text-red-500">
          {t("checkout.econt.errorLoadingOffices")}: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map showing office locations - moved above input to prevent dropdown overlay */}
      {offices.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            {t("checkout.econt.selectFromListOrMap")}
          </h3>
          {officesWithCoords.length > 0 ? (
            <MapComponent
              offices={officesWithCoords}
              selectedOfficeCode={selectedOfficeCode}
              onOfficeSelect={(code) => {
                const office = offices.find((o) => o.office_code === code)
                if (office) onOfficeSelect(office)
              }}
            />
          ) : (
            <div className="text-sm text-gray-500 p-4 border border-gray-200 rounded-md bg-gray-50">
              {t("checkout.econt.noOfficesWithCoordsBelow")}
            </div>
          )}
        </div>
      )}

      {/* Input field - moved below map */}
      <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("checkout.econt.officeRequired")}
      </label>
      <div className="relative">
        <input
          type="text"
          value={isOpen ? searchQuery : selectedOffice?.name || ""}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={t("checkout.econt.searchOffice")}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isOpen && filteredOffices.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredOffices.map((office) => (
                <button
                  key={office.office_code}
                  type="button"
                  onClick={() => handleOfficeClick(office)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="font-medium">{office.name}</div>
                  <div className="text-sm text-gray-500">{office.address}</div>
                  {office.phone && (
                    <div className="text-xs text-gray-400">{office.phone}</div>
                  )}
                </button>
            ))}
          </div>
            )}
        {isOpen && filteredOffices.length === 0 && searchQuery.trim() && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="px-4 py-2 text-sm text-gray-500">
              {t("checkout.econt.noOfficesFound")}
            </div>
          </div>
        )}
      </div>
      {selectedOffice && (
        <div className="mt-2 text-sm text-gray-600">
            {t("checkout.econt.selected")}: {selectedOffice.name} - {selectedOffice.address}
            </div>
          )}
        </div>

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default OfficeSelector

