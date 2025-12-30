"use client"

import SideMenu from "../side-menu"
import { HttpTypes } from "@medusajs/types"

type MobileMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  categories: HttpTypes.StoreProductCategory[]
}

const MobileMenu = ({ regions, categories }: MobileMenuProps) => {
  return (
    <div className="md:hidden">
      <SideMenu regions={regions} categories={categories} />
    </div>
  )
}

export default MobileMenu

