import Refresh from "@modules/common/icons/refresh"
import FastDelivery from "@modules/common/icons/fast-delivery"
import SecurePayment from "@modules/common/icons/secure-payment"
import PriceProtection from "@modules/common/icons/price-protection"

export default function TrustBadges() {
  const badges = [
    {
      id: "return",
      icon: Refresh,
      text: "Право на връщане",
    },
    {
      id: "delivery",
      icon: FastDelivery,
      text: "Експресна доставка",
    },
    {
      id: "payment",
      icon: SecurePayment,
      text: "Сигурно плащане",
    },
    {
      id: "protection",
      icon: PriceProtection,
      text: "Ценова защита",
    },
  ]

  return (
    <div className="bg-primary/5 border border-border-base rounded-3xl shadow-lg p-4 md:p-6 flex flex-row flex-wrap gap-3 md:gap-4">
      {badges.map((badge) => {
        const IconComponent = badge.icon
        return (
          <div
            key={badge.id}
            className="flex items-center gap-2 text-sm md:text-base text-text-secondary"
          >
            <IconComponent size="20" color="currentColor" className="text-primary flex-shrink-0" />
            <span>{badge.text}</span>
          </div>
        )
      })}
    </div>
  )
}
