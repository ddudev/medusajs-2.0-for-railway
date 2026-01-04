"use client"

import { Heading } from "@medusajs/ui"
import Divider from "@modules/common/components/divider"
import Spinner from "@modules/common/icons/spinner"

import { setAddresses } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useFormState } from "react-dom"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"
import { SubmitButton } from "../submit-button"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

const Addresses = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const { t } = useTranslation()
  const [message, formAction] = useFormState(setAddresses, null)

  return (
    <div className="bg-white">
      <Heading
        level="h2"
        className="flex flex-row text-3xl-regular gap-x-2 items-baseline mb-6"
      >
        {t("checkout.shippingAddress")}
      </Heading>
      <form action={formAction}>
        <div className="pb-8">
          <ShippingAddress customer={customer} cart={cart} />
          {/* Note: Billing address always same as shipping for Bulgaria - removed */}
          <SubmitButton className="mt-6" data-testid="submit-address-button">
            {t("checkout.continue")}
          </SubmitButton>
          <ErrorMessage error={message} data-testid="address-error-message" />
        </div>
      </form>
      <Divider className="mt-8" />
    </div>
  )
}

export default Addresses
