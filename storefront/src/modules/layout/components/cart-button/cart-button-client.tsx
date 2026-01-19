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
    currency_code: cart?.currency_code ?? "",
  })

  return (
    <button
      onClick={openCart}
      className="border-2 border-primary rounded-xl p-2 md:px-4 md:py-3 transition-colors flex items-center gap-4 hover:bg-primary/10 bg-transparent"
      data-testid="nav-cart-link"
      aria-label={`${t("cart.title")} (${totalItems} ${t("cartButton.items")})`}
    >
      {/* Cart Icon with Badge */}
      <div className="relative flex-shrink-0">
        <svg
          className="w-8 h-8 md:w-8 md:h-8 text-primary"
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
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-2 bg-primary text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center leading-none">
            {totalItems}
          </span>
        )}
      </div>

      {/* Price Info - Horizontal Layout - Hidden on mobile */}
      <div className="hidden lg:flex items-center gap-3">
        <span className="text-base font-medium text-text-primary whitespace-nowrap">
          {priceParts.eur !== '0' ? priceParts.eur : ""}
        </span>
        <span className="text-base font-medium text-text-primary whitespace-nowrap">
          {priceParts.bgn !== '0' ? priceParts.bgn : ""}
        </span>
        {/* Free Delivery Box */}
        {eligibility?.eligible ? (
          <div className="bg-amber-100 px-3 py-1.5 rounded text-sm text-text-primary font-medium whitespace-nowrap">
            {t("cart.freeShipping.message")}
          </div>
        ) : (<></>)}
      </div>
    </button>
  )
}

export default CartButtonClient
