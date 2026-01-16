"use client"

import { Popover, Transition } from "@headlessui/react"
import { ArrowRightMini, XMark, ChevronDown } from "@medusajs/icons"
import { Text, clx, useToggleState } from "@medusajs/ui"
import { Fragment, useState } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CountrySelect from "../country-select"
import { HttpTypes } from "@medusajs/types"

const SideMenuItems = {
  Home: "/",
  Store: "/store",
  Search: "/search",
  Account: "/account",
  Cart: "/cart",
}

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  categories?: HttpTypes.StoreProductCategory[]
}

const SideMenu = ({ regions, categories = [] }: SideMenuProps) => {
  const toggleState = useToggleState()

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  className="relative p-2 transition-all ease-out duration-200 focus:outline-none bg-primary text-white rounded-full md:bg-transparent md:text-text-secondary md:hover:text-text-primary md:rounded-none"
                >
                  <svg
                    className="w-8 h-8 md:w-5 md:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  <span className="hidden lg:inline">Menu</span>
                </Popover.Button>
              </div>

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0"
                enterTo="opacity-100 backdrop-blur-2xl"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 backdrop-blur-2xl"
                leaveTo="opacity-0"
              >
                <Popover.Panel className="flex flex-col fixed inset-0 w-full h-full z-50 bg-white md:absolute md:inset-auto md:right-0 md:top-0 md:w-1/3 md:max-w-sm md:h-[calc(100vh-1rem)] md:m-2 md:backdrop-blur-2xl md:bg-[rgba(3,7,18,0.5)] md:rounded-lg">
                  <div
                    data-testid="nav-menu-popup"
                    className="flex flex-col h-full bg-white md:bg-[rgba(3,7,18,0.5)] md:rounded-lg justify-between p-6"
                  >
                    <div className="flex justify-end" id="xmark">
                      <button data-testid="close-menu-button" onClick={close}>
                        <XMark />
                      </button>
                    </div>
                    <ul className="flex flex-col gap-6 items-start justify-start overflow-y-auto flex-1">
                      {Object.entries(SideMenuItems).map(([name, href]) => {
                        return (
                          <li key={name}>
                            <LocalizedClientLink
                              href={href}
                              className="text-2xl md:text-3xl leading-8 md:leading-10 text-text-primary md:text-ui-fg-on-color hover:text-primary md:hover:text-ui-fg-disabled transition-colors"
                              onClick={close}
                              data-testid={`${name.toLowerCase()}-link`}
                            >
                              {name}
                            </LocalizedClientLink>
                          </li>
                        )
                      })}

                      {/* Categories Section */}
                      {categories.length > 0 && (
                        <>
                          <li className="w-full pt-4 border-t border-border-base md:border-ui-border-base">
                            <Text className="text-lg md:text-xl text-text-secondary md:text-ui-fg-subtle uppercase tracking-wide">
                              Categories
                            </Text>
                          </li>
                          {categories.map((category) => {
                            const hasChildren =
                              category.category_children &&
                              category.category_children.length > 0

                            if (!hasChildren) {
                              return (
                                <li key={category.id} className="w-full">
                                  <LocalizedClientLink
                                    href={`/categories/${category.handle}`}
                                    className="text-xl md:text-2xl leading-7 md:leading-8 text-text-primary md:text-ui-fg-on-color hover:text-primary md:hover:text-ui-fg-disabled transition-colors"
                                    onClick={close}
                                  >
                                    {category.name}
                                  </LocalizedClientLink>
                                </li>
                              )
                            }

                            return (
                              <CategoryAccordion
                                key={category.id}
                                category={category}
                                onLinkClick={close}
                              />
                            )
                          })}
                        </>
                      )}
                    </ul>
                    <div className="flex flex-col gap-y-6">
                      <div
                        className="flex justify-between"
                        onMouseEnter={toggleState.open}
                        onMouseLeave={toggleState.close}
                      >
                        {regions && (
                          <CountrySelect
                            toggleState={toggleState}
                            regions={regions}
                          />
                        )}
                        <ArrowRightMini
                          className={clx(
                            "transition-transform duration-150",
                            toggleState.state ? "-rotate-90" : ""
                          )}
                        />
                      </div>
                      <Text className="flex justify-between txt-compact-small">
                        © {new Date().getFullYear()} MS Store. All rights
                        reserved.
                      </Text>
                    </div>
                  </div>
                </Popover.Panel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

// Category Accordion Component for nested categories
const CategoryAccordion = ({
  category,
  onLinkClick,
}: {
  category: HttpTypes.StoreProductCategory
  onLinkClick: () => void
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <li className="w-full">
      <div className="flex flex-col">
        <div className="flex items-center justify-between">
          <LocalizedClientLink
            href={`/categories/${category.handle}`}
            className="text-xl md:text-2xl leading-7 md:leading-8 text-text-primary md:text-ui-fg-on-color hover:text-primary md:hover:text-ui-fg-disabled transition-colors flex-1"
            onClick={onLinkClick}
          >
            {category.name}
          </LocalizedClientLink>
          {category.category_children && category.category_children.length > 0 && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="ml-4 p-2 hover:text-ui-fg-disabled transition-colors"
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              <ChevronDown
                className={clx(
                  "w-5 h-5 transition-transform duration-200",
                  isOpen ? "rotate-180" : ""
                )}
              />
            </button>
          )}
        </div>
        {isOpen && category.category_children && (
          <ul className="flex flex-col gap-3 mt-3 ml-4">
            {category.category_children.map((child) => (
              <li key={child.id}>
                <LocalizedClientLink
                  href={`/categories/${child.handle}`}
                  className="text-lg md:text-xl leading-6 md:leading-7 text-text-secondary md:text-ui-fg-subtle hover:text-text-primary md:hover:text-ui-fg-disabled transition-colors"
                  onClick={onLinkClick}
                >
                  {child.name}
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

export default SideMenu
