"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Brain,
  Heart,
  Users,
  Award,
  Stethoscope,
  Lightbulb,
  Microscope,
} from "lucide-react";

interface CardData {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

export default function ChangingCards() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const cards: CardData[] = [
    {
      title: "Academic Excellence",
      description:
        "Supporting students in achieving their academic goals through comprehensive resources, study materials, and mentorship programs designed to enhance learning outcomes.",
      icon: GraduationCap,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Mental Well-being",
      description:
        "Promoting mental health awareness and providing support systems for medical students to manage stress, anxiety, and the challenges of medical education.",
      icon: Brain,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Physical Health",
      description:
        "Organizing activities that encourage physical fitness, healthy lifestyle habits, and work-life balance for sustainable medical careers.",
      icon: Heart,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Community Building",
      description:
        "Creating a global network of medical students who support, learn from, and inspire each other throughout their educational journey.",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Professional Development",
      description:
        "Providing opportunities for career growth, skill development, and networking with healthcare professionals and industry experts.",
      icon: Award,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Medical Knowledge",
      description:
        "Sharing the latest medical research, innovations, clinical insights, and educational content to keep students updated with current practices.",
      icon: Stethoscope,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
    },
    {
      title: "Innovation",
      description:
        "Encouraging creative thinking, innovative approaches to medical education, and fostering entrepreneurial mindset among future healthcare leaders.",
      icon: Lightbulb,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Research Opportunities",
      description:
        "Connecting students with research projects, scientific exploration opportunities, and guidance for academic publications and presentations.",
      icon: Microscope,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [cards.length]);

  const currentCard = cards[currentIndex];

  return (
    <div className="relative h-[400px] w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className={`${currentCard.bgColor} rounded-2xl p-8 shadow-lg h-full flex flex-col justify-center`}
        >
          <div
            className={`w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6 shadow-md`}
          >
            <currentCard.icon className={`h-8 w-8 ${currentCard.color}`} />
          </div>
          <h3 className={`text-2xl font-bold mb-4 ${currentCard.color}`}>
            {currentCard.title}
          </h3>
          <p className="text-gray-700 text-lg leading-relaxed">
            {currentCard.description}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Progress indicators */}
      <div className="flex justify-center mt-6 space-x-2">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentIndex ? "bg-[#041c44] scale-125" : "bg-gray-300"
            }`}
            aria-label={`Go to card ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
