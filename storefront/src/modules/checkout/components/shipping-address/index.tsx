import { HttpTypes } from "@medusajs/types"
import { Container } from "@medusajs/ui"
import Input from "@modules/common/components/input"
import { mapKeys } from "lodash"
import React, { useEffect, useMemo, useState } from "react"
import AddressSelect from "../address-select"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
// TODO: Uncomment when needed - CountrySelect for international shipping
// import CountrySelect from "../country-select"

const ShippingAddress = ({
  customer,
  cart,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
}) => {
  const { t } = useTranslation()
  // Initialize with empty strings to prevent uncontrolled to controlled warning
  const [formData, setFormData] = useState<Record<string, any>>({
    "shipping_address.address_1": "",
    "shipping_address.postal_code": "",
    "shipping_address.city": "",
  })

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  // check if customer has saved addresses that are in the current region
  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  )

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    address &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        // Note: first_name, last_name, phone moved to Contact section
        // Note: company, country_code, province commented out for later use
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.city": address?.city || "",
        // TODO: Uncomment when needed - Company field for business addresses
        // "shipping_address.company": address?.company || "",
        // TODO: Uncomment when needed - Country field for international shipping
        // "shipping_address.country_code": address?.country_code || "",
        // TODO: Uncomment when needed - Province field for regions/states
        // "shipping_address.province": address?.province || "",
      }))

    // Note: email moved to Contact section
  }

  useEffect(() => {
    // Ensure cart is not null and has a shipping_address before setting form data
    // Note: Contact info (email, name, phone) is handled by Contact component
    if (cart && cart.shipping_address) {
      setFormAddress(cart?.shipping_address)
    }
  }, [cart]) // Add cart as a dependency

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

  return (
    <>
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="mb-6 flex flex-col gap-y-4 p-5">
          <p className="text-small-regular">
            {`Hi ${customer.first_name}, do you want to use one of your saved addresses?`}
          </p>
          <AddressSelect
            addresses={customer.addresses}
            addressInput={
              mapKeys(formData, (_, key) =>
                key.replace("shipping_address.", "")
              ) as HttpTypes.StoreCartAddress
            }
            onSelect={setFormAddress}
          />
        </Container>
      )}
      <div className="grid grid-cols-2 gap-4">
        {/* Note: First name, Last name, Phone, Email moved to Contact section */}
        <Input
          label={t("checkout.addressLine1")}
          name="shipping_address.address_1"
          autoComplete="address-line1"
          value={formData["shipping_address.address_1"] || ""}
          onChange={handleChange}
          required
          data-testid="shipping-address-input"
        />
        {/* TODO: Uncomment when needed - Company field for business addresses */}
        {/* <Input
          label={t("checkout.company")}
          name="shipping_address.company"
          value={formData["shipping_address.company"]}
          onChange={handleChange}
          autoComplete="organization"
          data-testid="shipping-company-input"
        /> */}
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
        {/* TODO: Uncomment when needed - Country field for international shipping */}
        {/* <CountrySelect
          name="shipping_address.country_code"
          autoComplete="country"
          region={cart?.region}
          value={formData["shipping_address.country_code"]}
          onChange={handleChange}
          required
          data-testid="shipping-country-select"
        /> */}
        {/* TODO: Uncomment when needed - Province field for regions/states */}
        {/* <Input
          label="State / Province"
          name="shipping_address.province"
          autoComplete="address-level1"
          value={formData["shipping_address.province"]}
          onChange={handleChange}
          required
          data-testid="shipping-province-input"
        /> */}
      </div>
      {/* Note: Billing address always same as shipping for Bulgaria - checkbox removed */}
    </>
  )
}

export default ShippingAddress
