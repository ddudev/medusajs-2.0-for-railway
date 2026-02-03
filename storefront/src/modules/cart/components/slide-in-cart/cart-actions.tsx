"use client"

import { Button } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useCartDrawer } from "@lib/store/ui-store"
import { HttpTypes } from "@medusajs/types"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

type CartActionsProps = {
  cart: HttpTypes.StoreCart
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const CartActions = ({ cart }: CartActionsProps) => {
  const { closeCart } = useCartDrawer()
  const { t } = useTranslation()
  const step = getCheckoutStep(cart)

  return (
    <div className="flex flex-col gap-3 pt-2">
      <LocalizedClientLink
        href="/cart"
        onClick={closeCart}
        className="w-full"
      >
        <Button
          variant="secondary"
          className="w-full bg-neutral-100 border border-border-base text-black hover:bg-primary hover:text-white transition-colors py-3 px-4 text-base font-medium shadow-none normal-case"
        >
          {t("cart.reviewOrder")}
        </Button>
      </LocalizedClientLink>
      <LocalizedClientLink
        href={`/checkout?step=${step}`}
        onClick={closeCart}
        className="w-full"
      >
        <Button className="w-full bg-black text-white hover:bg-primary-hover py-3 px-4 text-base font-medium shadow-none normal-case">
          {t("cart.checkout")}
        </Button>
      </LocalizedClientLink>
    </div>
  )
}

export default CartActions

