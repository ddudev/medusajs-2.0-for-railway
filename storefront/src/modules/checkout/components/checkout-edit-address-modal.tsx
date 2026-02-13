"use client"

import { useCallback, useEffect, useState, useActionState } from "react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import type { EcontData } from "@lib/data/econt"
import { updateCustomerAddress } from "@lib/data/customer"
import CountrySelect from "@modules/checkout/components/country-select"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"
import { HttpTypes } from "@medusajs/types"
import { EcontAddressBlock } from "@modules/account/components/address-card/econt-address-block"

const isBulgariaRegion = (region: HttpTypes.StoreRegion) =>
  region?.countries?.some((c) => c.iso_2?.toLowerCase() === "bg") ?? false

type CheckoutEditAddressModalProps = {
  isOpen: boolean
  onClose: () => void
  onSaved: (addressId: string) => void
  address: HttpTypes.StoreCustomerAddress
  region: HttpTypes.StoreRegion
}

export function CheckoutEditAddressModal({
  isOpen,
  onClose,
  onSaved,
  address,
  region,
}: CheckoutEditAddressModalProps) {
  const { t } = useTranslation()
  const [econtData, setEcontData] = useState<EcontData | null>(null)

  const initialEcont = (address as { metadata?: { econt?: EcontData } })
    ?.metadata?.econt ?? null

  useEffect(() => {
    if (isOpen) setEcontData(initialEcont ?? null)
  }, [isOpen, initialEcont])

  const [formState, formAction] = useActionState(updateCustomerAddress, {
    success: false,
    error: null,
    addressId: address.id,
  })

  useEffect(() => {
    if (formState.success) {
      onSaved(address.id)
      onClose()
    }
  }, [formState.success, address.id, onSaved, onClose])

  const handleEcontChange = useCallback((data: EcontData | null) => {
    setEcontData(data)
  }, [])

  const showEcont = isBulgariaRegion(region)

  return (
    <Modal
      isOpen={isOpen}
      close={onClose}
      data-testid="checkout-edit-address-modal"
      size="large"
    >
      <Modal.Title>
        <h2 className="text-lg font-semibold">{t("account.addresses.editAddress")}</h2>
      </Modal.Title>
      <form action={formAction}>
        <Modal.Body>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-x-2">
              <Input
                label={t("account.addresses.firstName")}
                name="first_name"
                required
                autoComplete="given-name"
                defaultValue={address.first_name ?? undefined}
                data-testid="first-name-input"
              />
              <Input
                label={t("account.addresses.lastName")}
                name="last_name"
                required
                autoComplete="family-name"
                defaultValue={address.last_name ?? undefined}
                data-testid="last-name-input"
              />
            </div>
            <Input
              label={t("account.addresses.company")}
              name="company"
              autoComplete="organization"
              defaultValue={address.company ?? undefined}
              data-testid="company-input"
            />
            <Input
              label={t("account.addresses.address")}
              name="address_1"
              required
              autoComplete="address-line1"
              defaultValue={address.address_1 ?? undefined}
              data-testid="address-1-input"
            />
            <Input
              label={t("account.addresses.apartmentSuite")}
              name="address_2"
              autoComplete="address-line2"
              defaultValue={address.address_2 ?? undefined}
              data-testid="address-2-input"
            />
            <div className="grid grid-cols-[144px_1fr] gap-x-2">
              <Input
                label={t("account.addresses.postalCode")}
                name="postal_code"
                required
                autoComplete="postal-code"
                defaultValue={address.postal_code ?? undefined}
                data-testid="postal-code-input"
              />
              <Input
                label={t("account.addresses.city")}
                name="city"
                required
                autoComplete="locality"
                defaultValue={address.city ?? undefined}
                data-testid="city-input"
              />
            </div>
            <Input
              label={t("account.addresses.provinceState")}
              name="province"
              autoComplete="address-level1"
              defaultValue={address.province ?? undefined}
              data-testid="state-input"
            />
            <CountrySelect
              name="country_code"
              region={region}
              required
              autoComplete="country"
              defaultValue={address.country_code ?? undefined}
              data-testid="country-select"
            />
            <Input
              label={t("account.addresses.phone")}
              name="phone"
              autoComplete="tel"
              defaultValue={address.phone ?? undefined}
              data-testid="phone-input"
            />
            {showEcont && (
              <EcontAddressBlock
                initialData={initialEcont}
                onDataChange={handleEcontChange}
              />
            )}
            {showEcont && (
              <input
                type="hidden"
                name="econt_json"
                value={JSON.stringify(econtData ?? {})}
                readOnly
              />
            )}
          </div>
          {formState.error && (
            <div className="text-destructive py-2 text-sm">{formState.error}</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="h-10"
              data-testid="cancel-button"
            >
              {t("common.cancel")}
            </Button>
            <SubmitButton data-testid="save-button">
              {t("common.save")}
            </SubmitButton>
          </div>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
