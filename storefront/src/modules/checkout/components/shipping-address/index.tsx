import { HttpTypes } from "@medusajs/types"
import { Container } from "@medusajs/ui"
import Input from "@modules/common/components/input"
import { mapKeys } from "lodash"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import AddressSelect from "../address-select"
import { CheckoutEditAddressModal } from "../checkout-edit-address-modal"
import EcontShipping from "../econt-shipping"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { saveEcontCartData } from "@lib/data/econt"
import type { EcontData } from "@lib/data/econt"
import { useCheckoutCart, useCheckoutActions } from "@lib/context/checkout-cart-context"
import { updateCartShippingAddress } from "@lib/data/cart"

/** Derive OFFICE vs DOOR from shipping method name/data */
function getEcontShippingType(method: HttpTypes.StoreCartShippingOption | null | undefined): "OFFICE" | "DOOR" {
  if (!method) return "OFFICE"
  const name = (method.name ?? "").toLowerCase()
  if (name.includes("office")) return "OFFICE"
  if (name.includes("address") || name.includes("door")) return "DOOR"
  const data = method.data as Record<string, unknown> | undefined
  const id = (data?.id ?? data?.fulfillment_option_id ?? data?.option_data?.id ?? "") as string
  if (id.includes("office") || id === "econt-office") return "OFFICE"
  if (id.includes("door") || id.includes("address") || id === "econt-door" || id === "econt-standard" || id === "econt-express") return "DOOR"
  return "OFFICE"
}

const ShippingAddress = ({
  customer,
  cart: cartProp,
  availableShippingMethods,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  availableShippingMethods?: HttpTypes.StoreCartShippingOption[] | null
}) => {
  const { t } = useTranslation()
  const router = useRouter()
  const { cart: cartFromContext } = useCheckoutCart()
  const { updateCartData } = useCheckoutActions()
  const cart = cartFromContext ?? cartProp
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editAddress, setEditAddress] = useState<HttpTypes.StoreCustomerAddress | null>(null)
  const [lastEditedAddressId, setLastEditedAddressId] = useState<string | null>(null)

  // Initialize with empty strings to prevent uncontrolled to controlled warning
  const [formData, setFormData] = useState<Record<string, any>>({
    "shipping_address.address_1": "",
    "shipping_address.postal_code": "",
    "shipping_address.city": "",
  })

  const selectedShippingMethod = useMemo(
    () =>
      availableShippingMethods?.find(
        (m) => m.id === cart?.shipping_methods?.at(-1)?.shipping_option_id
      ) ?? null,
    [availableShippingMethods, cart?.shipping_methods]
  )
  const isEcont = (selectedShippingMethod?.name ?? "").toLowerCase().includes("econt")
  const econtShippingTo = getEcontShippingType(selectedShippingMethod ?? undefined)
  const isEcontOffice = isEcont && econtShippingTo === "OFFICE"
  const isEcontAddress = isEcont && econtShippingTo === "DOOR"

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  // Saved addresses in region, then filter by method type: office vs physical
  const addressesInRegionByMethod = useMemo(() => {
    const inRegion =
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ) ?? []
    if (!selectedShippingMethod) return inRegion
    const isOffice = isEcontOffice
    return inRegion.filter((a) => {
      const meta = (a as { metadata?: { econt?: EcontData } }).metadata?.econt
      if (isOffice) {
        // Show addresses saved as Econt Office: explicit OFFICE or has office_code (in case shipping_to wasn't persisted)
        return meta?.shipping_to === "OFFICE" || (Boolean(meta?.office_code) && meta?.shipping_to !== "DOOR")
      }
      return meta?.shipping_to === "DOOR" || !meta
    })
  }, [customer?.addresses, countriesInRegion, selectedShippingMethod, isEcontOffice])

  const setFormAddress = useCallback(
    (address?: HttpTypes.StoreCartAddress, _email?: string) => {
      if (!address) {
        setFormData({
          "shipping_address.address_1": "",
          "shipping_address.postal_code": "",
          "shipping_address.city": "",
        })
        return
      }
      setFormData((prevState: Record<string, unknown>) => ({
        ...prevState,
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.city": address?.city || "",
      }))
      const withMeta = address as HttpTypes.StoreCartAddress & { metadata?: { econt?: EcontData } }
      const econt = withMeta?.metadata?.econt
      if (cart?.id && econt && typeof econt === "object") {
        saveEcontCartData(cart.id, econt).catch(() => {})
      }
    },
    [cart?.id]
  )

  const handleSelectAddress = useCallback(
    async (address?: HttpTypes.StoreCartAddress) => {
      setFormAddress(address)
      if (!address || !cart?.id) return
      const withMeta = address as HttpTypes.StoreCartAddress & { metadata?: { econt?: EcontData } }
      const econt = withMeta?.metadata?.econt
      if (econt && typeof econt === "object") {
        saveEcontCartData(cart.id, econt).catch(() => {})
      }
      const result = await updateCartShippingAddress({
        address_1: address.address_1 ?? "",
        postal_code: address.postal_code ?? "",
        city: address.city ?? "",
        first_name: address.first_name ?? undefined,
        last_name: address.last_name ?? undefined,
        phone: address.phone ?? undefined,
      })
      if (result.cart) updateCartData(result.cart)
    },
    [cart?.id, setFormAddress, updateCartData]
  )

  useEffect(() => {
    if (cart && cart.shipping_address) {
      setFormAddress(cart.shipping_address)
    }
  }, [cart])

  useEffect(() => {
    if (lastEditedAddressId && customer?.addresses) {
      const updated = customer.addresses.find((a) => a.id === lastEditedAddressId)
      if (updated) setFormAddress(updated as HttpTypes.StoreCartAddress)
      setLastEditedAddressId(null)
    }
  }, [customer?.addresses, lastEditedAddressId, setFormAddress])

  // Debounced save of manual address fields to cart (non-Econt methods only)
  useEffect(() => {
    if (!selectedShippingMethod || isEcont || !cart?.id) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const a1 = formData["shipping_address.address_1"]
      const pc = formData["shipping_address.postal_code"]
      const city = formData["shipping_address.city"]
      if (!a1 && !pc && !city) return
      const result = await updateCartShippingAddress({
        address_1: a1 ?? "",
        postal_code: pc ?? "",
        city: city ?? "",
      })
      if (result.cart) updateCartData(result.cart)
      debounceRef.current = null
    }, 600)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [formData["shipping_address.address_1"], formData["shipping_address.postal_code"], formData["shipping_address.city"], selectedShippingMethod, isEcont, cart?.id, updateCartData])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleEdit = useCallback((address: HttpTypes.StoreCustomerAddress) => {
    setEditAddress(address)
    setEditModalOpen(true)
  }, [])

  const handleEditSaved = useCallback((addressId: string) => {
    setLastEditedAddressId(addressId)
    setEditModalOpen(false)
    setEditAddress(null)
    router.refresh()
  }, [])

  const showAddressContent = selectedShippingMethod != null
  const showEcontUI = isEcont && cart

  // When Econt Office data is saved, set minimal shipping_address so Place order can enable
  const handleEcontDataChange = useCallback(
    (data: EcontData | null) => {
      if (
        !data ||
        data.shipping_to !== "OFFICE" ||
        !data.city_name ||
        !data.postcode ||
        !cart?.id
      )
        return
      updateCartShippingAddress({
        address_1: "Econt Office",
        city: data.city_name,
        postal_code: data.postcode,
      }).then((result) => {
        if (result.cart) updateCartData(result.cart)
      })
    },
    [cart?.id, updateCartData]
  )

  return (
    <>
      {!showAddressContent && (
        <p className="text-small-regular text-muted-foreground">
          {t("checkout.selectDeliveryMethodAbove")}
        </p>
      )}
      {showAddressContent && (
        <>
          {customer && (addressesInRegionByMethod?.length || 0) > 0 && (
            <Container className="mb-6 flex flex-col gap-y-4 p-5">
              <p className="text-small-regular">
                {customer.first_name ? `${customer.first_name}, ` : ""}
                {t("checkout.useSavedAddress")}
              </p>
              <AddressSelect
                addresses={addressesInRegionByMethod ?? []}
                addressInput={
                  mapKeys(formData, (_, key) =>
                    key.replace("shipping_address.", "")
                  ) as HttpTypes.StoreCartAddress
                }
                onSelect={handleSelectAddress}
                onAddNew={() => setFormAddress(undefined)}
                onEdit={handleEdit}
              />
            </Container>
          )}
          {editAddress && cart?.region && (
            <CheckoutEditAddressModal
              isOpen={editModalOpen}
              onClose={() => {
                setEditModalOpen(false)
                setEditAddress(null)
              }}
              onSaved={handleEditSaved}
              address={editAddress}
              region={cart.region}
            />
          )}
          {showEcontUI && (
            <EcontShipping
              cart={cart}
              shippingMethod={selectedShippingMethod}
              initialShippingTo={econtShippingTo}
              onDataChange={handleEcontDataChange}
            />
          )}
          {!isEcont && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t("checkout.addressLine1")}
                name="shipping_address.address_1"
                autoComplete="address-line1"
                value={formData["shipping_address.address_1"] || ""}
                onChange={handleChange}
                required
                data-testid="shipping-address-input"
              />
              <Input
                label={t("checkout.postalCode")}
                name="shipping_address.postal_code"
                autoComplete="postal-code"
                value={formData["shipping_address.postal_code"] || ""}
                onChange={handleChange}
                required
                data-testid="shipping-postal-code-input"
              />
              <Input
                label={t("checkout.city")}
                name="shipping_address.city"
                autoComplete="address-level2"
                value={formData["shipping_address.city"] || ""}
                onChange={handleChange}
                required
                data-testid="shipping-city-input"
              />
            </div>
          )}
        </>
      )}
    </>
  )
}

export default ShippingAddress
