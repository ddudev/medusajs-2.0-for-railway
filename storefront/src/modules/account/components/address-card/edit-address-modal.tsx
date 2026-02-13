"use client"

import { useCallback, useEffect, useState, useActionState } from "react"
import { Loader2, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import useToggleState from "@lib/hooks/use-toggle-state"
import type { EcontData } from "@lib/data/econt"
import {
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@lib/data/customer"
import CountrySelect from "@modules/checkout/components/country-select"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"
import { HttpTypes } from "@medusajs/types"
import { cn } from "@/lib/utils"
import { EcontAddressBlock } from "./econt-address-block"

const isBulgariaRegion = (region: HttpTypes.StoreRegion) =>
  region.countries?.some((c) => c.iso_2?.toLowerCase() === "bg") ?? false

type EditAddressProps = {
  region: HttpTypes.StoreRegion
  address: HttpTypes.StoreCustomerAddress
  isActive?: boolean
}

const EditAddress: React.FC<EditAddressProps> = ({
  region,
  address,
  isActive = false,
}) => {
  const { t } = useTranslation()
  const [removing, setRemoving] = useState(false)
  const [successState, setSuccessState] = useState(false)
  const [econtData, setEcontData] = useState<EcontData | null>(null)
  const { state, open, close: closeModal } = useToggleState(false)

  const initialEcont = (address as { metadata?: { econt?: EcontData } })
    ?.metadata?.econt ?? null

  useEffect(() => {
    if (state) setEcontData(initialEcont ?? null)
  }, [state, initialEcont])

  const [formState, formAction] = useActionState(updateCustomerAddress, {
    success: false,
    error: null,
    addressId: address.id,
  })

  const close = () => {
    setSuccessState(false)
    closeModal()
  }

  useEffect(() => {
    if (successState) close()
  }, [successState])

  useEffect(() => {
    if (formState.success) setSuccessState(true)
  }, [formState])

  const handleEcontChange = useCallback((data: EcontData | null) => {
    setEcontData(data)
  }, [])

  const removeAddress = async () => {
    setRemoving(true)
    await deleteCustomerAddress(address.id)
    setRemoving(false)
  }

  const showEcont = isBulgariaRegion(region)

  return (
    <>
      <Card
        className={cn(
          "flex min-h-[220px] w-full flex-col justify-between transition-colors",
          isActive && "ring-2 ring-primary"
        )}
        data-testid="address-container"
      >
        <CardContent className="flex flex-col justify-between gap-4 p-5">
          <div className="flex flex-col">
            <p
              className="text-base font-semibold text-foreground"
              data-testid="address-name"
            >
              {address.first_name} {address.last_name}
            </p>
            {address.company && (
              <p
                className="text-sm text-muted-foreground"
                data-testid="address-company"
              >
                {address.company}
              </p>
            )}
            <div className="mt-2 flex flex-col text-sm text-muted-foreground">
              <span data-testid="address-address">
                {address.address_1}
                {address.address_2 && `, ${address.address_2}`}
              </span>
              <span data-testid="address-postal-city">
                {address.postal_code}, {address.city}
              </span>
              <span data-testid="address-province-country">
                {address.province && `${address.province}, `}
                {address.country_code?.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-foreground"
              onClick={open}
              data-testid="address-edit-button"
            >
              <Pencil className="h-4 w-4" />
              {t("account.addresses.edit")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={removeAddress}
              disabled={removing}
              data-testid="address-delete-button"
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("account.addresses.remove")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={state}
        close={close}
        data-testid="edit-address-modal"
        size="large"
      >
        <Modal.Title>
          <h2 className="text-lg font-semibold">
            {t("account.addresses.editAddress")}
          </h2>
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
              <div className="text-destructive py-2 text-sm">
                {formState.error}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={close}
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
    </>
  )
}

export default EditAddress
