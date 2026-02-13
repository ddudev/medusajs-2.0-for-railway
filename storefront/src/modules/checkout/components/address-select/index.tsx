import { Listbox, Transition } from "@headlessui/react"
import { ChevronUpDown } from "@medusajs/icons"
import { Pencil } from "lucide-react"
import { clx } from "@medusajs/ui"
import { Fragment, useEffect, useMemo, useState } from "react"

import Radio from "@modules/common/components/radio"
import compareAddresses from "@lib/util/compare-addresses"
import { HttpTypes } from "@medusajs/types"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { Button } from "@/components/ui/button"

const ADD_NEW_VALUE = "__new__"

type AddressSelectProps = {
  addresses: HttpTypes.StoreCustomerAddress[]
  addressInput: HttpTypes.StoreCartAddress | null
  onSelect: (
    address: HttpTypes.StoreCartAddress | undefined,
    email?: string
  ) => void
  onAddNew?: () => void
  onEdit?: (address: HttpTypes.StoreCustomerAddress) => void
}

const AddressSelect = ({
  addresses,
  addressInput,
  onSelect,
  onAddNew,
  onEdit,
}: AddressSelectProps) => {
  const { t } = useTranslation()
  const [addNewSelected, setAddNewSelected] = useState(false)

  const selectedAddress = useMemo(() => {
    return addresses.find((a) => compareAddresses(a, addressInput))
  }, [addresses, addressInput])

  useEffect(() => {
    if (selectedAddress) setAddNewSelected(false)
  }, [selectedAddress])

  const listboxValue = selectedAddress?.id ?? (addNewSelected ? ADD_NEW_VALUE : undefined)

  const handleSelect = (id: string) => {
    if (id === ADD_NEW_VALUE) {
      setAddNewSelected(true)
      onAddNew?.()
      return
    }
    setAddNewSelected(false)
    const savedAddress = addresses.find((a) => a.id === id)
    if (savedAddress) {
      onSelect(savedAddress as HttpTypes.StoreCartAddress)
    }
  }

  const buttonLabel = selectedAddress
    ? selectedAddress.address_1
    : addNewSelected
      ? t("checkout.addNewAddress")
      : t("checkout.chooseAddress")

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex items-center gap-2">
        <Listbox onChange={handleSelect} value={listboxValue}>
          <div className="relative flex-1">
            <Listbox.Button
              className="relative w-full flex justify-between items-center px-4 py-[10px] text-left bg-white cursor-default focus:outline-none border rounded-rounded focus-visible:ring-2 focus-visible:ring-opacity-75 focus-visible:ring-white focus-visible:ring-offset-gray-300 focus-visible:ring-offset-2 focus-visible:border-gray-300 text-base-regular"
              data-testid="shipping-address-select"
            >
              {({ open }) => (
                <>
                  <span className="block truncate">{buttonLabel}</span>
                  <ChevronUpDown
                    className={clx("transition-rotate duration-200", {
                      "transform rotate-180": open,
                    })}
                  />
                </>
              )}
            </Listbox.Button>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options
                className="absolute z-20 w-full overflow-auto text-small-regular bg-white border border-top-0 max-h-60 focus:outline-none sm:text-sm"
                data-testid="shipping-address-options"
              >
                {addresses.map((address) => (
                  <Listbox.Option
                    key={address.id}
                    value={address.id}
                    className="cursor-default select-none relative pl-6 pr-10 hover:bg-gray-50 py-4"
                    data-testid="shipping-address-option"
                  >
                    <div className="flex gap-x-4 items-start">
                      <Radio
                        checked={selectedAddress?.id === address.id}
                        data-testid="shipping-address-radio"
                      />
                      <div className="flex flex-col">
                        <span className="text-left text-base-semi">
                          {address.first_name} {address.last_name}
                        </span>
                        {address.company && (
                          <span className="text-small-regular text-ui-fg-base">
                            {address.company}
                          </span>
                        )}
                        <div className="flex flex-col text-left text-base-regular mt-2">
                          <span>
                            {address.address_1}
                            {address.address_2 && (
                              <span>, {address.address_2}</span>
                            )}
                          </span>
                          <span>
                            {address.postal_code}, {address.city}
                          </span>
                          <span>
                            {address.province && `${address.province}, `}
                            {address.country_code?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Listbox.Option>
                ))}
                <Listbox.Option
                  value={ADD_NEW_VALUE}
                  className="cursor-default select-none relative pl-6 pr-10 hover:bg-gray-50 py-4 border-t"
                  data-testid="shipping-address-option-new"
                >
                  <div className="flex gap-x-4 items-center">
                    <Radio
                      checked={addNewSelected && !selectedAddress}
                      data-testid="shipping-address-radio-new"
                    />
                    <span className="text-base-regular">
                      {t("checkout.addNewAddress")}
                    </span>
                  </div>
                </Listbox.Option>
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
        {selectedAddress && onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 text-foreground"
            onClick={() => onEdit(selectedAddress)}
            data-testid="shipping-address-edit-button"
          >
            <Pencil className="h-4 w-4" />
            {t("checkout.editAddress")}
          </Button>
        )}
      </div>
    </div>
  )
}

export default AddressSelect
