"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useSiteContent, type ContentItem } from "@/hooks/useSiteContent";

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { content } = useSiteContent();

  const faqs: FAQItem[] = content.faq.map((row: ContentItem) => ({
    question: row.heading,
    answer: row.body ?? '',
  }));

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="space-y-3 sm:space-y-4">
        {faqs.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="bg-white rounded-xl sm:rounded-2xl border-2 border-blue-100 overflow-hidden hover:border-blue-200 transition-colors duration-300"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="flex justify-between items-center w-full p-4 sm:p-5 md:p-6 text-left focus:outline-none group"
            >
              <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent pr-4">
                {faq.question}
              </h3>
              <motion.div
                animate={{ rotate: activeIndex === index ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full p-1.5 sm:p-2 group-hover:from-blue-200 group-hover:to-cyan-200 transition-colors duration-300 flex-shrink-0"
              >
                <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
              </motion.div>
            </button>
            <AnimatePresence>
              {activeIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 sm:p-5 md:p-6 pt-0 border-t border-blue-100">
                    <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
