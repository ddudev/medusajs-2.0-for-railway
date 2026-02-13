"use client"

import { useCallback, useEffect, useState } from "react"

import { Label } from "@/components/ui/label"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import type { EcontData } from "@lib/data/econt"
import CitySelector from "@modules/checkout/components/econt-shipping/city-selector"
import OfficeSelector from "@modules/checkout/components/econt-shipping/office-selector"
import AddressFields from "@modules/checkout/components/econt-shipping/address-fields"
import { cn } from "@/lib/utils"

interface EcontAddressBlockProps {
  initialData?: EcontData | null
  onDataChange: (data: EcontData | null) => void
  className?: string
}

export function EcontAddressBlock({
  initialData,
  onDataChange,
  className,
}: EcontAddressBlockProps) {
  const { t } = useTranslation()
  const [shippingTo, setShippingTo] = useState<"OFFICE" | "DOOR">(
    initialData?.shipping_to === "DOOR" ? "DOOR" : "OFFICE"
  )
  const [selectedCity, setSelectedCity] = useState<number | null>(
    initialData?.city_id ?? null
  )
  const [selectedCityName, setSelectedCityName] = useState<string | null>(
    initialData?.city_name ?? null
  )
  const [selectedCityPostcode, setSelectedCityPostcode] = useState<string | null>(
    initialData?.postcode ?? null
  )
  const [selectedOffice, setSelectedOffice] = useState<string | null>(
    initialData?.office_code ?? null
  )
  const [econtData, setEcontData] = useState<EcontData | null>(initialData ?? null)

  useEffect(() => {
    onDataChange(econtData)
  }, [econtData, onDataChange])

  const handleCitySelect = useCallback(
    (cityId: number, cityName: string, postcode: string) => {
      if (!cityId || !cityName) return
      setSelectedCity(cityId)
      setSelectedCityName(cityName)
      setSelectedCityPostcode(postcode)
      setSelectedOffice(null)
      const newData: EcontData = {
        shipping_to: shippingTo,
        city_id: cityId,
        city_name: cityName,
        postcode: postcode,
      }
      if (shippingTo === "OFFICE") {
        delete (newData as Record<string, unknown>).office_code
      } else {
        delete (newData as Record<string, unknown>).street
        delete (newData as Record<string, unknown>).street_num
        delete (newData as Record<string, unknown>).quarter
        delete (newData as Record<string, unknown>).building_num
        delete (newData as Record<string, unknown>).entrance_num
        delete (newData as Record<string, unknown>).floor_num
        delete (newData as Record<string, unknown>).apartment_num
        delete (newData as Record<string, unknown>).other
      }
      setEcontData(newData)
    },
    [shippingTo]
  )

  const handleOfficeSelect = useCallback((officeCode: string) => {
    setSelectedOffice(officeCode)
    setEcontData((prev) => {
      if (!selectedCity || !selectedCityName || !selectedCityPostcode) return prev
      return {
        ...(prev ?? {}),
        shipping_to: "OFFICE" as const,
        office_code: officeCode,
        city_id: selectedCity,
        city_name: selectedCityName,
        postcode: selectedCityPostcode,
      }
    })
  }, [selectedCity, selectedCityName, selectedCityPostcode])

  const handleAddressChange = useCallback(
    (addressData: Partial<EcontData>) => {
      if (!selectedCity || !selectedCityName || !selectedCityPostcode) return
      setEcontData((prev) => ({
        ...(prev ?? {}),
        shipping_to: "DOOR" as const,
        city_id: selectedCity,
        city_name: selectedCityName,
        postcode: selectedCityPostcode,
        ...addressData,
      } as EcontData))
    },
    [selectedCity, selectedCityName, selectedCityPostcode]
  )

  const shouldShowOfficeSelector =
    selectedCity &&
    selectedCity > 0 &&
    Number.isInteger(selectedCity) &&
    shippingTo === "OFFICE"

  return (
    <div className={cn("space-y-4 rounded-lg border p-4", className)}>
      <Label className="text-sm font-medium">
        {t("account.addresses.econt.title")}
      </Label>
      <div className="flex gap-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="econt_shipping_to"
            checked={shippingTo === "OFFICE"}
            onChange={() => setShippingTo("OFFICE")}
            className="h-4 w-4"
          />
          <span className="text-sm">{t("account.addresses.econt.toOffice")}</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="econt_shipping_to"
            checked={shippingTo === "DOOR"}
            onChange={() => setShippingTo("DOOR")}
            className="h-4 w-4"
          />
          <span className="text-sm">{t("account.addresses.econt.toAddress")}</span>
        </label>
      </div>
      <CitySelector
        onCitySelect={handleCitySelect}
        selectedCityId={selectedCity}
        selectedCityName={selectedCityName}
        selectedCityPostcode={selectedCityPostcode}
      />
      {shouldShowOfficeSelector && (
        <OfficeSelector
          cityId={selectedCity}
          onOfficeSelect={handleOfficeSelect}
          selectedOfficeCode={selectedOffice}
        />
      )}
      {selectedCity && shippingTo === "DOOR" && (
        <AddressFields
          cityId={selectedCity}
          onAddressChange={handleAddressChange}
          initialData={econtData}
        />
      )}
    </div>
  )
}
