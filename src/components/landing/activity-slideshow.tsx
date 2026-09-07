"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SlideData {
  image: string;
  title: string;
  description: string;
}

export default function ActivitySlideshow() {
  const [current, setCurrent] = useState(0);

  const slides: SlideData[] = [
    {
      image: "/images/exploring-georgia.jpg",
      title: "Exploring Georgia",
      description: "Landscapes, culture, and history",
    },
    {
      image: "/images/treasure-hunt.jpg",
      title: "Treasure Hunt",
      description: "Fun challenges + medical trivia",
    },
    {
      image: "/images/trekking.jpg",
      title: "Trekking Adventures",
      description: "Fitness, resilience, and nature",
    },
    {
      image: "/images/med-talks.jpg",
      title: "Med Talks",
      description: "Experts, insights, careers",
    },
    {
      image: "/images/webinars.jpg",
      title: "Free Webinars",
      description: "Guidance and learning online",
    },
    {
      image: "/images/study-sessions.jpg",
      title: "Study Sessions",
      description: "Peer learning and mentorship",
    },
  ];

  useEffect(() => {
    const t = setInterval(
      () => setCurrent((p) => (p + 1) % slides.length),
      2500
    );
    return () => clearInterval(t);
  }, [slides.length]);

  // Slides animate in from off to one side; without `overflow-hidden` here
  // they stick out past the viewport and the whole page scrolls sideways.
  return (
    <div className="relative h-[300px] sm:h-[400px] md:h-[520px] w-full mb-8 overflow-hidden md:mb-0">
      <AnimatePresence mode="popLayout">
        {slides.map((slide, index) => {
          const offset = (index - current + slides.length) % slides.length;
          const isActive = offset === 0;

          return (
            <motion.div
              key={index}
              initial={false}
              animate={{
                x: offset * 15,
                y: offset * 12,
                scale: 1 - offset * 0.05,
                rotate: offset * -2,
                opacity: offset < 3 ? 1 - offset * 0.3 : 0,
                zIndex: slides.length - offset,
              }}
              transition={{
                duration: 0.3,
                ease: [0.32, 0.72, 0, 1],
              }}
              className="absolute inset-0"
              style={{ pointerEvents: isActive ? "auto" : "none" }}
            >
              <div className="relative h-full w-full rounded-2xl sm:rounded-3xl overflow-hidden border-2 sm:border-4 border-white">
                <img
                  src={slide.image || "/placeholder.svg"}
                  alt={slide.title}
                  className="object-cover w-full h-full"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 via-blue-900/20 to-transparent" />

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 20 }}
                  transition={{ delay: 0.2 }}
                  className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-4 sm:left-6 md:left-8 text-white"
                >
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">
                    {slide.title}
                  </h3>
                  <p className="text-blue-200 text-sm sm:text-base md:text-lg">
                    {slide.description}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
