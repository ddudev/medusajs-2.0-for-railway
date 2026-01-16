import React from "react"

import UnderlineLink from "@modules/common/components/interactive-link"

import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div className="flex-1 small:py-12 bg-background-base" data-testid="account-page">
      <div className="flex-1 content-container h-full max-w-5xl mx-auto flex flex-col">
        <div className={customer ? "grid grid-cols-1 small:grid-cols-[240px_1fr] py-12 gap-8" : "flex flex-col py-12 items-center justify-center w-full"}>
          {customer && (
            <div>
              <AccountNav customer={customer} />
            </div>
          )}
          <div className="flex-1 w-full flex justify-center">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
