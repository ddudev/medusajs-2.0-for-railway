import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import MedusaCTA from "@modules/layout/components/medusa-cta"
import { ToastContainer } from "@modules/common/components/toast-container"
import { StoreLogo } from "@modules/common/components/store-logo"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
    <div className="w-full bg-white relative small:min-h-screen">
        <div className="h-16 bg-background-base border-b ">
          <nav className="flex h-full items-center content-container justify-between">
            <LocalizedClientLink
              href="/cart"
              className="text-small-semi text-ui-fg-base flex items-center gap-x-2 uppercase flex-1 basis-0"
              data-testid="back-to-cart-link"
            >
              <ChevronDown className="rotate-90" size={16} />
              <span className="mt-px hidden small:block txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base ">
                Обратно към количка
              </span>
              <span className="mt-px block small:hidden txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base">
                Back
              </span>
            </LocalizedClientLink>
            <StoreLogo
              variant="full-only"
              href="/"
              width={120}
              className="text-ui-fg-subtle"
              aria-label="Nezbg Store"
              data-testid="store-link"
            />
            <div className="flex-1 basis-0" />
          </nav>
        </div>
        <div className="relative" data-testid="checkout-container">{children}</div>
        <div className="py-4 w-full flex items-center justify-center bg-background-base border-t border-border-base">
          <MedusaCTA />
        </div>
      </div>
      <ToastContainer />
    </>
  )
}
