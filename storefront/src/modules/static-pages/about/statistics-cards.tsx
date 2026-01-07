import React from "react"
import { Card, CardContent, Typography } from "@mui/material"
import { getTranslation } from "@lib/i18n/server"
import type { TranslationKeys } from "@lib/i18n/config"
import {
  People as PeopleIcon,
  HeadsetMic as HeadsetIcon,
  Star as StarIcon,
  LocalShipping as ShippingIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material"

type StatisticsCardsProps = {
  translations: TranslationKeys
}

const statistics = [
  {
    id: "clients",
    icon: <PeopleIcon className="w-12 h-12 text-primary" />,
    number: "1.000.000+",
    labelKey: "about.stats.clients",
    defaultLabel: "satisfied customers",
  },
  {
    id: "consultation",
    icon: <HeadsetIcon className="w-12 h-12 text-primary" />,
    number: "Free",
    labelKey: "about.stats.consultation",
    defaultLabel: "consultation",
  },
  {
    id: "rating",
    icon: <StarIcon className="w-12 h-12 text-primary" />,
    number: "9.5",
    labelKey: "about.stats.rating",
    defaultLabel: "out of 10 according to customer reviews",
  },
  {
    id: "processing",
    icon: <ShippingIcon className="w-12 h-12 text-primary" />,
    number: "Express",
    labelKey: "about.stats.processing",
    defaultLabel: "order processing",
  },
  {
    id: "visits",
    icon: <VisibilityIcon className="w-12 h-12 text-primary" />,
    number: "10.000.000+",
    labelKey: "about.stats.visits",
    defaultLabel: "website visits",
  },
]

export default function StatisticsCards({
  translations,
}: StatisticsCardsProps) {
  const t = (key: string) => getTranslation(translations, key)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
      {statistics.map((stat) => (
        <Card
          key={stat.id}
          className="bg-background-elevated hover:shadow-lg transition-shadow"
        >
          <CardContent className="flex flex-col items-center text-center p-6">
            <div className="mb-4">{stat.icon}</div>
            <Typography
              variant="h4"
              className="font-bold text-text-primary mb-2"
            >
              {stat.number}
            </Typography>
            <Typography variant="body2" className="text-text-secondary">
              {t(stat.labelKey) || stat.defaultLabel}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
