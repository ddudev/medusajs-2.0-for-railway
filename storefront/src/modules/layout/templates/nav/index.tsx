import { Suspense, cache } from "react"

import TopHeader from "@modules/layout/components/top-promo-bar"
import MainHeader from "@modules/layout/components/main-header"
import CartButton from "@modules/layout/components/cart-button"
import { enrichLineItems, retrieveCart } from "@lib/data/cart"
import { getCategoriesList } from "@lib/data/categories"

// Cache the cart fetch to prevent duplicate calls within the same request
const fetchCart = cache(async () => {
  try {
    const cart = await retrieveCart()

    if (!cart) {
      return null
    }

    if (cart?.items?.length) {
      const enrichedItems = await enrichLineItems(cart.items, cart.region_id!)
      cart.items = enrichedItems
    }

    return cart
  } catch (error) {
    console.error("Error fetching cart:", error)
    return null
  }
})

// Nav component - Fetch cart here (Server Component) and pass to TopPromoBar
export default async function Nav({ countryCode }: { countryCode: string }) {
  // Fetch cart in Server Component to avoid "Server Functions cannot be called during initial render" error
  const cart = await fetchCart()
  const { product_categories } = await getCategoriesList(0, 100)

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      {/* Top Promotional Bar - Black bar with logo, search, login, cart */}
      <TopHeader cart={cart} categories={product_categories} />

      {/* Main Header - Black bar with orange All Products button and category links */}
      <MainHeader countryCode={countryCode} categories={product_categories} />
    </div>
  )
}
