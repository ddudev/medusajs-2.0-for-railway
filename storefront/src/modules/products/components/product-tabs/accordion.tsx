"use client"

import React from "react"
import {
  Accordion as ShadcnAccordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

type AccordionItemProps = {
  title: string
  subtitle?: string
  description?: string
  required?: boolean
  tooltip?: string
  forceMountContent?: true
  headingSize?: "small" | "medium" | "large"
  customTrigger?: React.ReactNode
  complete?: boolean
  active?: boolean
  triggerable?: boolean
  children: React.ReactNode
  value?: string
  className?: string
}

type AccordionProps = {
  type?: "single" | "multiple"
  defaultValue?: string | string[]
  children: React.ReactNode
  className?: string
}

const headingSizeClasses = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg font-semibold",
}

const AccordionRoot: React.FC<AccordionProps> & {
  Item: React.FC<AccordionItemProps>
} = ({ children, type = "single", defaultValue, className }) => {
  return (
    <ShadcnAccordion
      type={type}
      defaultValue={defaultValue as string | string[] | undefined}
      className={cn(className)}
      collapsible={type === "single"}
    >
      {children}
    </ShadcnAccordion>
  )
}

const Item: React.FC<AccordionItemProps> = ({
  title,
  subtitle,
  description,
  children,
  className,
  headingSize = "large",
  value,
}) => {
  const itemValue = value ?? title

  return (
    <AccordionItem value={itemValue} className={cn("border-t border-gray-200 last:border-b", className)}>
      <AccordionTrigger className="px-1 py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
        <div className="flex flex-col w-full text-left">
          <div className="flex w-full items-center justify-between">
            <span
              className={cn(
                "text-gray-600",
                headingSize === "small" && headingSizeClasses.small,
                headingSize === "medium" && headingSizeClasses.medium,
                headingSize === "large" && headingSizeClasses.large
              )}
            >
              {title}
            </span>
          </div>
          {subtitle && (
            <span className="mt-1 text-sm text-gray-500">{subtitle}</span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-1">
        {description && (
          <p className="mb-2 text-sm text-gray-600">{description}</p>
        )}
        <div className="w-full">{children}</div>
      </AccordionContent>
    </AccordionItem>
  )
}

AccordionRoot.Item = Item

export default AccordionRoot
