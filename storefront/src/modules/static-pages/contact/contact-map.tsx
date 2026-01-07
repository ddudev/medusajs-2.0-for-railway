"use client"

import React from "react"

export default function ContactMap() {
  return (
    <div className="w-full mt-6">
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2774.1234567890123!2d14.1234567!3d46.1234567!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDbCsDA3JzI0LjQiTiAxNMKwMDcnMjQuNCJF!5e0!3m2!1sen!2sus!4v1234567890123!5m2!1sen!2sus"
        width="100%"
        height="400"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="rounded-lg"
        title="Company Location"
      />
    </div>
  )
}
