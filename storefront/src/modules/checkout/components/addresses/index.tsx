"use client"

import { Heading } from "@medusajs/ui"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"
import ShippingAddress from "../shipping-address"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

const Addresses = ({
  cart,
  customer,
  availableShippingMethods,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  availableShippingMethods?: HttpTypes.StoreCartShippingOption[] | null
}) => {
  const { t } = useTranslation()

  return (
    <div className="bg-white">
      <Heading level="h2" className="checkout-heading">
        {t("checkout.shippingAddress")}
      </Heading>
      <div className="pb-8">
        <ShippingAddress
          customer={customer}
          cart={cart}
          availableShippingMethods={availableShippingMethods ?? null}
        />
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default Addresses
