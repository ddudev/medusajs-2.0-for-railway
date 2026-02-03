'use client'

import React from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ModalProvider, useModal } from "@lib/context/modal-context"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

type ModalProps = {
  isOpen: boolean
  close: () => void
  size?: "small" | "medium" | "large"
  search?: boolean
  children: React.ReactNode
  "data-testid"?: string
}

const Modal = ({
  isOpen,
  close,
  size = "medium",
  search = false,
  children,
  "data-testid": dataTestId,
}: ModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        hideCloseButton
        data-testid={dataTestId}
        className={cn(
          "relative z-[75] flex max-h-[75vh] flex-col justify-start p-5 text-left",
          {
            "max-w-md": size === "small",
            "max-w-xl": size === "medium",
            "max-w-3xl": size === "large",
            "bg-transparent shadow-none border-0": search,
            "bg-white shadow-xl border rounded-lg": !search,
          }
        )}
      >
        <ModalProvider close={close}>{children}</ModalProvider>
      </DialogContent>
    </Dialog>
  )
}

const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { close } = useModal()

  return (
    <DialogTitle className="flex items-center justify-between text-left">
      <span className="text-large-semi">{children}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={close}
        data-testid="close-modal-button"
        className="h-8 w-8"
      >
        <X className="h-5 w-5" />
        <span className="sr-only">Close</span>
      </Button>
    </DialogTitle>
  )
}

const Description: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DialogDescription className="flex text-small-regular text-muted-foreground items-center justify-center pt-2 pb-4 h-full">
      {children}
    </DialogDescription>
  )
}

const Body: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="flex justify-center">{children}</div>
}

const Footer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="flex items-center justify-end gap-x-4">{children}</div>
}

Modal.Title = Title
Modal.Description = Description
Modal.Body = Body
Modal.Footer = Footer

export default Modal
