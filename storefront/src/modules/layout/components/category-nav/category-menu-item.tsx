"use client"

import { Popover, Transition } from "@headlessui/react"
import { ChevronDown, ChevronRight } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Fragment, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { createPortal } from "react-dom"

type CategoryMenuItemProps = {
  category: HttpTypes.StoreProductCategory
}

const CategoryMenuItem = ({ category }: CategoryMenuItemProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hoveredChild, setHoveredChild] = useState<HttpTypes.StoreProductCategory | null>(null)
  const [panelPosition, setPanelPosition] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const pathname = usePathname()
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const hasChildren =
    category.category_children && category.category_children.length > 0

  // Check if current category is active
  const isActive = pathname?.includes(`/categories/${category.handle}`)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePanelPosition = () => {
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()

    setPanelPosition({
      top: rect.bottom,
      left: rect.left,
      width: rect.width,
    })
  }

  const handleMouseEnter = () => {
    setIsOpen(true)
    updatePanelPosition()
  }

  const handleMouseLeave = () => {
    setIsOpen(false)
    setHoveredChild(null)
  }

  if (!hasChildren) {
    return (
      <LocalizedClientLink
        href={`/categories/${category.handle}`}
        prefetch={false}
        className={`text-sm text-white hover:text-primary transition-colors whitespace-nowrap font-medium relative pb-1 ${
          isActive
            ? "after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-white"
            : "hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:w-full hover:after:h-[1px] hover:after:bg-white"
        }`}
      >
        {category.name}
      </LocalizedClientLink>
    )
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <Popover className="relative">
        <Popover.Button
          ref={buttonRef}
          className={`flex items-center gap-1 text-sm text-white font-medium hover:text-primary transition-colors whitespace-nowrap outline-none relative pb-1 ${
            isActive
              ? "after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-white"
              : ""
          }`}
        >
          <LocalizedClientLink
            href={`/categories/${category.handle}`}
            prefetch={false}
            className="hover:text-primary"
          >
            {category.name}
          </LocalizedClientLink>
          <ChevronDown className="w-4 h-4" />
        </Popover.Button>

        {mounted && panelPosition &&
          createPortal(
            <Transition
              show={isOpen}
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel
                static
                className="fixed z-50 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-visible"
                style={{
                  top: panelPosition.top,
                  left: panelPosition.left,
                  minWidth: panelPosition.width,
                }}
              >
                <div className="py-1 overflow-visible">
                  {category.category_children?.map((child) => {
                    const childHasChildren =
                      child.category_children && child.category_children.length > 0
                    if (childHasChildren) {
                      return (
                        <div
                          key={child.id}
                          className="relative"
                          onMouseEnter={() => setHoveredChild(child)}
                          onMouseLeave={() => setHoveredChild(null)}
                        >
                          <LocalizedClientLink
                            href={`/categories/${child.handle}`}
                            prefetch={false}
                            className="flex items-center justify-between px-4 py-2 lg:text-base text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          >
                            {child.name}
                            <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-400" />
                          </LocalizedClientLink>
                          {hoveredChild?.id === child.id && (
                            <div className="absolute left-full top-0 min-w-[180px] rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-50">
                              {child.category_children?.map((grandchild) => (
                                <LocalizedClientLink
                                  key={grandchild.id}
                                  href={`/categories/${grandchild.handle}`}
                                  prefetch={false}
                                  className="block px-4 py-2 lg:text-base text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                >
                                  {grandchild.name}
                                </LocalizedClientLink>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }
                    return (
                      <LocalizedClientLink
                        key={child.id}
                        href={`/categories/${child.handle}`}
                        prefetch={false}
                        className="block px-4 py-2 lg:text-base text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      >
                        {child.name}
                      </LocalizedClientLink>
                    )
                  })}
                </div>
              </Popover.Panel>
            </Transition>,
            document.body
          )}
      </Popover>
    </div>
  )
}

export default CategoryMenuItem
// "use client"

// import { Popover, Transition } from "@headlessui/react"
// import { ChevronDown } from "@medusajs/icons"
// import { HttpTypes } from "@medusajs/types"
// import LocalizedClientLink from "@modules/common/components/localized-client-link"
// import { Fragment, useState } from "react"
// import { usePathname } from "next/navigation"

// type CategoryMenuItemProps = {
//     category: HttpTypes.StoreProductCategory
// }

// const CategoryMenuItem = ({ category }: CategoryMenuItemProps) => {
//     const [isOpen, setIsOpen] = useState(false)
//     const pathname = usePathname()
//     const hasChildren =
//         category.category_children && category.category_children.length > 0

//     // Check if current category is active
//     const isActive = pathname?.includes(`/categories/${category.handle}`)

//     if (!hasChildren) {
//         return (
//             <LocalizedClientLink
//                 href={`/categories/${category.handle}`}
//                 prefetch={false}
//                 className={`text-sm text-white hover:text-primary transition-colors whitespace-nowrap font-medium relative pb-1 ${
//                     isActive 
//                         ? "after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-white" 
//                         : "hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:w-full hover:after:h-[1px] hover:after:bg-white"
//                 }`}
//             >
//                 {category.name}
//             </LocalizedClientLink>
//         )
//     }

//     return (
//         <div
//             onMouseEnter={() => setIsOpen(true)}
//             onMouseLeave={() => setIsOpen(false)}
//             className="relative"
//         >
//             <Popover className="relative">
//                 <Popover.Button
//                     className={`flex items-center gap-1 text-sm text-white hover:text-primary transition-colors whitespace-nowrap font-medium outline-none relative pb-1 ${
//                         isActive 
//                             ? "after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-white" 
//                             : ""
//                     }`}
//                 >
//                     <LocalizedClientLink
//                         href={`/categories/${category.handle}`}
//                         prefetch={false}
//                         className="hover:text-primary"
//                     >
//                         {category.name}
//                     </LocalizedClientLink>
//                     <ChevronDown className="w-4 h-4" />
//                 </Popover.Button>

//                 <Transition
//                     show={isOpen}
//                     as={Fragment}
//                     enter="transition ease-out duration-200"
//                     enterFrom="opacity-0 translate-y-1"
//                     enterTo="opacity-100 translate-y-0"
//                     leave="transition ease-in duration-150"
//                     leaveFrom="opacity-100 translate-y-0"
//                     leaveTo="opacity-0 translate-y-1"
//                 >
//                     <Popover.Panel static className="absolute left-0 z-50 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
//                         <div className="py-1">
//                             {category.category_children?.map((child) => (
//                                 <LocalizedClientLink
//                                     key={child.id}
//                                     href={`/categories/${child.handle}`}
//                                     prefetch={false}
//                                     className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
//                                 >
//                                     {child.name}
//                                 </LocalizedClientLink>
//                             ))}
//                         </div>
//                     </Popover.Panel>
//                 </Transition>
//             </Popover>
//         </div>
//     )
// }

// export default CategoryMenuItem
