"use client"

import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SearchBar from "@modules/layout/components/main-header/search-bar"
import AccountLink from "@modules/layout/components/main-header/account-link"
import CartButton from "@modules/layout/components/cart-button"
import { HttpTypes } from "@medusajs/types"

import MobileMenu from "@modules/layout/components/mobile-menu"

type TopHeaderProps = {
  categories?: HttpTypes.StoreProductCategory[]
}

const TopHeader = ({ categories = [] }: TopHeaderProps) => {
  return (
    <div className="w-full bg-white h-[64px] md:h-[106px] border-b border-gray-100 md:border-none shadow-[0_4px_20px_rgba(0,0,0,0.08)] z-[100] sticky top-0">
      <div className="content-container h-full">
        <div className="flex items-center justify-between gap-4 h-full relative">

          {/* Mobile Only: Left Hamburger Menu */}
          <div className="flex md:hidden items-center">
            <MobileMenu regions={[]} categories={categories} />
          </div>

          {/* Logo - Centered on mobile, Left on desktop */}
          <div className="flex-1 md:flex-none flex justify-center md:justify-start">
            <LocalizedClientLink
              href="/"
              className="flex items-center"
              data-testid="nav-store-link"
            >
              <Image
                src="/images/nez-logo-color-light.svg"
                alt="NEZBG Logo"
                width={120}
                height={32}
                priority
                className="object-contain block"
                style={{ height: '32px', width: '120px', minHeight: '32px', minWidth: '120px' }}
              />
            </LocalizedClientLink>
          </div>

          {/* Desktop Only: Center Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4 relative">
            <SearchBar />
          </div>

          {/* Right Group: Search (mobile), Account, Cart */}
          <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
            {/* Mobile Search Icon */}
            <div className="md:hidden">
              <SearchBar />
            </div>

            <AccountLink />
            <CartButton />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopHeader

