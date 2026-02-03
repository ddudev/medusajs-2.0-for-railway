"use client"

import { useCartDrawer } from "@lib/store/ui-store"
import { convertToLocaleParts } from "@lib/util/money"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { useCart, useCartItemCount } from "@lib/hooks/use-cart"
import { useFreeShipping } from "@lib/hooks/use-promotions"

const CartButtonClient = () => {
  const { t } = useTranslation()
  const { openCart } = useCartDrawer()
  const { data: cart } = useCart()
  const { data: eligibility } = useFreeShipping()
  const totalItems = useCartItemCount()

  const total = cart?.total ?? 0

  const priceParts = convertToLocaleParts({
    amount: total,
    currency_code: cart?.currency_code ?? "EUR",
  })

  return (
    <button
      onClick={openCart}
      className="border border-primary rounded-xl md:h-14 transition-colors flex items-center hover:bg-primary/10 bg-background-base overflow-hidden"
      data-testid="nav-cart-link"
      aria-label={`${t("cart.title")} (${totalItems} ${t("cartButton.items")})`}
    >
      <div className="flex flex-row items-center gap-3 py-1 px-2 md:px-3 md:py-2">
        {/* Cart Icon with Badge */}
        <div className="relative flex-shrink-0">
          <svg
            className="w-6 h-6 md:w-6 md:h-6 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <span className="absolute -bottom-1 -right-2 bg-primary text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {totalItems}
          </span>
        </div>

      {/* Price Info - Horizontal Layout - Hidden on mobile */}
        <div className="flex flex-col items-center gap-0 lg:gap-2 lg:flex-row">
          <span className="text-sm lg:text-base font-medium text-text-primary whitespace-nowrap">
            {priceParts.eur}
          </span>
          <span className="text-xs lg:text-sm font-medium text-text-primary whitespace-nowrap leading-tight">
            {priceParts.bgn}
          </span>
        </div>
      </div>
      {/* Free Delivery Box */}
      {eligibility?.eligible ? (
          <div className="hidden md:flex bg-primary px-3 py-1.5 w-[88px] rounded text-xs text-white font-medium text-left h-full items-center leading-tight">
            {t("cart.freeShipping.message")}
          </div>
        ) : (<></>)}
    </button>
  )
}

export default CartButtonClient
