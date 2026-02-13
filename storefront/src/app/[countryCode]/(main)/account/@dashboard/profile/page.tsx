import { Metadata } from "next"
import { notFound } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { listRegions } from "@lib/data/regions"
import { getCustomer } from "@lib/data/customer"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import ProfilePassword from "@modules/account/components/profile-password"
import ProfilePhone from "@modules/account/components/profile-phone"
import ProfileCardHeader from "@modules/account/components/profile-card-header"

export const metadata: Metadata = {
  title: "Profile",
  description: "View and edit your profile.",
}

export default async function ProfilePage() {
  const customer = await getCustomer()
  const regions = await listRegions()

  if (!customer || !regions) {
    notFound()
  }

  return (
    <div className="w-full max-w-2xl" data-testid="profile-page-wrapper">
      <Card>
        <ProfileCardHeader />
        <CardContent className="flex flex-col gap-6">
          <ProfileName customer={customer} />
          <Separator />
          <ProfileEmail customer={customer} />
          <Separator />
          <ProfilePhone customer={customer} />
          <Separator />
          <ProfilePassword customer={customer} />
          <Separator />
          <ProfileBillingAddress customer={customer} regions={regions} />
        </CardContent>
      </Card>
    </div>
  )
}
