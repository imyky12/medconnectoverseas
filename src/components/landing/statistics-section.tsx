"use client";

import type React from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useEffect, useState } from "react";
import { Users, Award, BookOpen, Globe, Heart, Zap } from "lucide-react";

interface StatItem {
  number: number;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  suffix?: string;
}

export default function StatisticsSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.3 });

  const stats: StatItem[] = [
    {
      number: 50,
      label: "Workshops",
      icon: BookOpen,
      color: "text-yellow-400",
      bgColor: "bg-gradient-to-br from-yellow-400/20 to-orange-400/20",
      suffix: "+",
    },
    {
      number: 10,
      label: "Speakers",
      icon: Award,
      color: "text-cyan-400",
      bgColor: "bg-gradient-to-br from-cyan-400/20 to-blue-400/20",
      suffix: "+",
    },
    {
      number: 100,
      label: "Participants",
      icon: Users,
      color: "text-green-400",
      bgColor: "bg-gradient-to-br from-green-400/20 to-emerald-400/20",
      suffix: "+",
    },
    {
      number: 3,
      label: "Countries",
      icon: Globe,
      color: "text-purple-400",
      bgColor: "bg-gradient-to-br from-purple-400/20 to-pink-400/20",
      suffix: "+",
    },
    {
      number: 100,
      label: "Success Stories",
      icon: Heart,
      color: "text-pink-400",
      bgColor: "bg-gradient-to-br from-pink-400/20 to-rose-400/20",
      suffix: "+",
    },
    {
      number: 12,
      label: "Monthly Events",
      icon: Zap,
      color: "text-orange-400",
      bgColor: "bg-gradient-to-br from-orange-400/20 to-amber-400/20",
    },
  ];

  return (
    // The heading belongs to the section that wraps this component in
    // Home.tsx, styled to match every other section heading on the page.
    // Repeating it here printed it twice.
    <div ref={ref} className="w-full max-w-4xl mx-auto px-4 pb-12">
      {/* Grid Layout - 2x3 */}
      <div className="grid grid-cols-2 gap-0">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: index * 0.15 }}
            className={`flex flex-col items-center justify-center py-8 px-4 ${
              index % 2 === 0 ? "border-r border-slate-400" : ""
            } ${index < 4 ? "border-b border-slate-400" : ""}`}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={inView ? { scale: 1 } : {}}
              transition={{ duration: 0.4, delay: index * 0.15 + 0.2 }}
              className="text-center"
            >
              <div className="flex items-baseline justify-center">
                <CountUpNumber
                  target={stat.number}
                  inView={inView}
                  delay={index * 0.1 + 0.3}
                  className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-400"
                />
                <span className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-400">
                  {stat.suffix}
                </span>
              </div>
              <p className="text-slate-300 font-semibold text-base sm:text-lg mt-3">
                {stat.label}
              </p>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CountUpNumber({
  target,
  inView,
  delay,
  className,
}: {
  target: number;
  inView: boolean;
  delay: number;
  className?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const timer = setTimeout(() => {
      let start = 0;
      const step = Math.max(1, Math.round(target / 40));
      const interval = setInterval(() => {
        start += step;
        if (start >= target) {
          setCount(target);
          clearInterval(interval);
        } else {
          setCount(start);
        }
      }, 30);
      return () => clearInterval(interval);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [inView, target, delay]);

  return <span className={className}>{count}</span>;
}
