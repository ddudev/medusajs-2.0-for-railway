"use client"

import { useState } from "react"
import { useParams, usePathname } from "next/navigation"
import { ArrowRightOnRectangle } from "@medusajs/icons"
import { LayoutDashboard, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import User from "@modules/common/icons/user"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import { HttpTypes } from "@medusajs/types"
import { signout } from "@lib/data/customer"

const AccountNav = ({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) => {
  const { t } = useTranslation()
  const route = usePathname()
  const { countryCode } = useParams() as { countryCode: string }
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleLogout = async () => {
    await signout(countryCode)
  }

  const navLinks = [
    { href: "/account", label: t("account.nav.overview"), testId: "overview-link" },
    { href: "/account/profile", label: t("account.nav.profile"), testId: "profile-link" },
    { href: "/account/addresses", label: t("account.nav.addresses"), testId: "addresses-link" },
    { href: "/account/orders", label: t("account.nav.orders"), testId: "orders-link" },
  ]

  const isActive = (href: string) => route.split(countryCode)[1] === href

  const navItemClass = (href: string) =>
    cn(
      "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
      "hover:bg-accent hover:text-accent-foreground",
      {
        "bg-accent text-accent-foreground": isActive(href),
        "text-muted-foreground": !isActive(href),
      }
    )

  return (
    <>
      {/* Mobile: Sheet trigger + drawer */}
      <div className="small:hidden w-full" data-testid="mobile-account-nav">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              data-testid="account-menu-trigger"
            >
              <Menu className="h-4 w-4" />
              {t("account.nav.menuOpen")}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px]">
            <SheetHeader>
              <SheetTitle>{t("account.nav.title")}</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-0.5 pt-6">
              {navLinks.map(({ href, label, testId }) => (
                <LocalizedClientLink
                  key={href}
                  href={href}
                  className={navItemClass(href)}
                  data-testid={testId}
                  onClick={() => setSheetOpen(false)}
                >
                  {href === "/account" && (
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                  )}
                  {href === "/account/profile" && (
                    <User size={20} className="shrink-0" />
                  )}
                  {href === "/account/addresses" && (
                    <MapPin size={20} className="shrink-0" />
                  )}
                  {href === "/account/orders" && (
                    <Package size={20} className="shrink-0" />
                  )}
                  {label}
                </LocalizedClientLink>
              ))}
              <Separator className="my-2" />
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium",
                  "text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => {
                  setSheetOpen(false)
                  handleLogout()
                }}
                data-testid="logout-button"
              >
                <ArrowRightOnRectangle />
                {t("account.nav.logOut")}
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Sidebar */}
      <div className="hidden small:block w-full" data-testid="account-nav">
        <h3 className="text-base font-semibold text-foreground">{t("account.nav.title")}</h3>
        <Separator className="my-4" />
        <ul className="flex flex-col gap-0.5">
          {navLinks.map(({ href, label, testId }) => (
            <li key={href}>
              <AccountNavLink
                href={href}
                data-testid={testId}
                className={navItemClass(href)}
              >
                {href === "/account" && (
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                )}
                {href === "/account/profile" && (
                  <User size={20} className="shrink-0" />
                )}
                {href === "/account/addresses" && (
                  <MapPin size={20} className="shrink-0" />
                )}
                {href === "/account/orders" && (
                  <Package size={20} className="shrink-0" />
                )}
                {label}
              </AccountNavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium",
                "text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={handleLogout}
              data-testid="logout-button"
            >
              <ArrowRightOnRectangle />
              {t("account.nav.logOut")}
            </button>
          </li>
        </ul>
      </div>
    </>
  )
}

type AccountNavLinkProps = {
  href: string
  children: React.ReactNode
  className?: string
  "data-testid"?: string
}

function AccountNavLink({
  href,
  children,
  className,
  "data-testid": dataTestId,
}: AccountNavLinkProps) {
  return (
    <LocalizedClientLink
      href={href}
      className={className}
      data-testid={dataTestId}
    >
      {children}
    </LocalizedClientLink>
  )
}

export default AccountNav
