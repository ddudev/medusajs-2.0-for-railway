"use client"

import { useCallback, useEffect, useState, useActionState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import useToggleState from "@lib/hooks/use-toggle-state"
import type { EcontData } from "@lib/data/econt"
import { addCustomerAddress } from "@lib/data/customer"
import CountrySelect from "@modules/checkout/components/country-select"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"
import { HttpTypes } from "@medusajs/types"
import { EcontAddressBlock } from "./econt-address-block"

const isBulgariaRegion = (region: HttpTypes.StoreRegion) =>
  region.countries?.some((c) => c.iso_2?.toLowerCase() === "bg") ?? false

const AddAddress = ({ region }: { region: HttpTypes.StoreRegion }) => {
  const { t } = useTranslation()
  const [successState, setSuccessState] = useState(false)
  const [econtData, setEcontData] = useState<EcontData | null>(null)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(addCustomerAddress, {
    success: false,
    error: null,
  })

  const close = () => {
    setSuccessState(false)
    setEcontData(null)
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

  const showEcont = isBulgariaRegion(region)

  return (
    <>
      <Card
        className="flex min-h-[220px] cursor-pointer flex-col justify-between border-dashed transition-colors hover:bg-muted/50"
        onClick={open}
        data-testid="add-address-button"
      >
        <CardContent className="flex flex-col justify-between gap-2 p-5">
          <span className="text-base font-semibold text-foreground">
            {t("account.addresses.newAddress")}
          </span>
          <Plus className="h-8 w-8 text-muted-foreground" />
        </CardContent>
      </Card>

      <Modal isOpen={state} close={close} data-testid="add-address-modal" size="large">
        <Modal.Title>
          <h2 className="text-lg font-semibold">{t("account.addresses.addAddress")}</h2>
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
                  data-testid="first-name-input"
                />
                <Input
                  label={t("account.addresses.lastName")}
                  name="last_name"
                  required
                  autoComplete="family-name"
                  data-testid="last-name-input"
                />
              </div>
              <Input
                label={t("account.addresses.company")}
                name="company"
                autoComplete="organization"
                data-testid="company-input"
              />
              <Input
                label={t("account.addresses.address")}
                name="address_1"
                required
                autoComplete="address-line1"
                data-testid="address-1-input"
              />
              <Input
                label={t("account.addresses.apartmentSuite")}
                name="address_2"
                autoComplete="address-line2"
                data-testid="address-2-input"
              />
              <div className="grid grid-cols-[144px_1fr] gap-x-2">
                <Input
                  label={t("account.addresses.postalCode")}
                  name="postal_code"
                  required
                  autoComplete="postal-code"
                  data-testid="postal-code-input"
                />
                <Input
                  label={t("account.addresses.city")}
                  name="city"
                  required
                  autoComplete="locality"
                  data-testid="city-input"
                />
              </div>
              <Input
                label={t("account.addresses.provinceState")}
                name="province"
                autoComplete="address-level1"
                data-testid="state-input"
              />
              <CountrySelect
                region={region}
                name="country_code"
                required
                autoComplete="country"
                data-testid="country-select"
              />
              <Input
                label={t("account.addresses.phone")}
                name="phone"
                autoComplete="tel"
                data-testid="phone-input"
              />
              {showEcont && (
                <EcontAddressBlock
                  initialData={null}
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
              <div
                className="text-destructive text-sm py-2"
                data-testid="address-error"
              >
                {formState.error}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-3 mt-6">
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

export default AddAddress
