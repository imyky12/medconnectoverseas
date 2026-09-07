"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  initials: string;
  content: string;
}

export default function TestimonialCarousel() {
  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Aisha S.",
      role: "3rd Year Medical Student",
      initials: "AS",
      content:
        "The study sessions organized by MCO have significantly improved my academic performance. The community is supportive and the resources are invaluable.",
    },
    {
      id: 2,
      name: "Michael K.",
      role: "2nd Year Medical Student",
      initials: "MK",
      content:
        "The trekking adventures were not just fun but also helped me build meaningful connections with fellow students. MCO truly cares about our well-being.",
    },
    {
      id: 3,
      name: "Leila P.",
      role: "4th Year Medical Student",
      initials: "LP",
      content:
        "The Med Talks provided me with insights from experienced professionals that I couldn't get elsewhere. MCO has been instrumental in my medical education journey.",
    },
    {
      id: 4,
      name: "David R.",
      role: "1st Year Medical Student",
      initials: "DR",
      content:
        "As a first-year student, I was overwhelmed until I joined MCO. Their guidance and community support made my transition into medical school much smoother.",
    },
    {
      id: 5,
      name: "Sarah T.",
      role: "Final Year Medical Student",
      initials: "ST",
      content:
        "The webinars and resources provided by MCO have been crucial for my exam preparations. I'm grateful for this community during my final year.",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (!autoplay) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, autoplay]);

  const nextSlide = () => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length
    );
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 py-8">
      <div className="relative overflow-hidden h-64 md:h-56">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute w-full"
            onHoverStart={() => setAutoplay(false)}
            onHoverEnd={() => setAutoplay(true)}
          >
            <div className="bg-gray-50 p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-[#041c44] flex items-center justify-center text-white font-bold text-lg mr-4">
                  {testimonials[currentIndex].initials}
                </div>
                <div>
                  <h4 className="font-semibold text-[#041c44]">
                    {testimonials[currentIndex].name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {testimonials[currentIndex].role}
                  </p>
                </div>
              </div>
              <p className="text-gray-700">
                "{testimonials[currentIndex].content}"
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center mt-6 space-x-2">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
            className={`w-2 h-2 rounded-full ${
              index === currentIndex ? "bg-[#041c44]" : "bg-gray-300"
            } transition-colors`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <button
        onClick={prevSlide}
        className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md z-10"
        aria-label="Previous testimonial"
      >
        <ChevronLeft className="h-5 w-5 text-[#041c44]" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md z-10"
        aria-label="Next testimonial"
      >
        <ChevronRight className="h-5 w-5 text-[#041c44]" />
      </button>
    </div>
  );
}
