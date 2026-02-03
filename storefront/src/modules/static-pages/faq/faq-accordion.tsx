"use client"

import React from "react"
import Accordion from "@modules/products/components/product-tabs/accordion"

type FAQQuestion = {
  id: string
  question: {
    en: string
    bg: string
  }
  answer: {
    en: string
    bg: string
  }
}

type FAQAccordionProps = {
  questions: FAQQuestion[]
  locale: string
}

export default function FAQAccordion({ questions, locale }: FAQAccordionProps) {
  if (questions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary">No questions found in this category.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {questions.map((question) => {
          const questionText =
            locale === "bg" ? question.question.bg : question.question.en
          const answerText =
            locale === "bg" ? question.answer.bg : question.answer.en

          return (
            <Accordion.Item
              key={question.id}
              title={questionText}
              headingSize="medium"
              className="mb-4"
            >
              <p className="text-text-secondary whitespace-pre-line text-sm">
                {answerText}
              </p>
            </Accordion.Item>
          )
        })}
      </Accordion>
    </div>
  )
}
