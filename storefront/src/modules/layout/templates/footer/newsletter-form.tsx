"use client"

import { useState } from "react"
import { trackNewsletterSignup } from "@lib/analytics/lead-capture"

type NewsletterFormProps = {
    placeholderText: string
    subscribeText: string
    consentText: string
}

export default function NewsletterForm({
    placeholderText,
    subscribeText,
    consentText
}: NewsletterFormProps) {
    const [email, setEmail] = useState("")
    const [consent, setConsent] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Track newsletter signup to GTM and Meta Pixel
        if (email) {
            await trackNewsletterSignup({
                email,
                source: 'footer',
                hasMarketingConsent: consent,
            })
        }
        
        // TODO: Implement newsletter subscription logic
        console.log("Newsletter subscription:", { email, consent })
    }

    return (
        <form onSubmit={handleSubmit} className="w-full md:w-auto">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={placeholderText}
                    className="px-4 py-2 rounded text-sm w-full sm:w-64 text-gray-900"
                    required
                />
                <button
                    type="submit"
                    className="px-6 py-2 bg-interactive text-white rounded text-sm font-medium hover:bg-interactive-hover transition-colors whitespace-nowrap w-full sm:w-auto"
                >
                    {subscribeText}
                </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
                <input
                    type="checkbox"
                    id="newsletter-consent"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="w-4 h-4"
                    required
                />
                <label htmlFor="newsletter-consent" className="text-xs text-white cursor-pointer">
                    {consentText}
                </label>
            </div>
        </form>
    )
}
