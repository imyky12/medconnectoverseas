"use client";

import { useEffect, useRef } from "react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  initials: string;
  content: string;
  gradient: string;
}

export default function TestimonialScroll() {
  const containerRef = useRef<HTMLDivElement>(null);

  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Aisha S.",
      role: "3rd Year Medical Student",
      initials: "AS",
      content:
        "The study sessions organized by MCO have significantly improved my academic performance. The community is supportive and the resources are invaluable.",
      gradient: "from-blue-500 to-blue-700",
    },
    {
      id: 2,
      name: "Michael K.",
      role: "2nd Year Medical Student",
      initials: "MK",
      content:
        "The trekking adventures were not just fun but also helped me build meaningful connections with fellow students. MCO truly cares about our well-being.",
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      id: 3,
      name: "Leila P.",
      role: "4th Year Medical Student",
      initials: "LP",
      content:
        "The Med Talks provided me with insights from experienced professionals that I couldn't get elsewhere. MCO has been instrumental in my medical education journey.",
      gradient: "from-blue-600 to-cyan-600",
    },
    {
      id: 4,
      name: "David R.",
      role: "1st Year Medical Student",
      initials: "DR",
      content:
        "As a first-year student, I was overwhelmed until I joined MCO. Their guidance and community support made my transition into medical school much smoother.",
      gradient: "from-blue-700 to-blue-900",
    },
    {
      id: 5,
      name: "Sarah T.",
      role: "Final Year Medical Student",
      initials: "ST",
      content:
        "The webinars and resources provided by MCO have been crucial for my exam preparations. I'm grateful for this community during my final year.",
      gradient: "from-cyan-600 to-blue-700",
    },
    {
      id: 6,
      name: "James L.",
      role: "2nd Year Medical Student",
      initials: "JL",
      content:
        "The exploring Georgia activity was the highlight of my semester. I made lifelong friends and learned so much about the local healthcare system.",
      gradient: "from-blue-600 to-blue-800",
    },
    {
      id: 7,
      name: "Emma W.",
      role: "3rd Year Medical Student",
      initials: "EW",
      content:
        "MCO's treasure hunt combined fun with medical knowledge in a way I've never experienced before. It was both educational and incredibly entertaining.",
      gradient: "from-blue-500 to-cyan-600",
    },
  ];

  const allTestimonials = [...testimonials, ...testimonials];

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;

      if (scrollLeft + clientWidth >= scrollWidth - 10) {
        containerRef.current.scrollTo({ left: 0, behavior: "auto" });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  useEffect(() => {
    const autoScroll = () => {
      if (!containerRef.current) return;

      const currentScroll = containerRef.current.scrollLeft;
      containerRef.current.scrollTo({
        left: currentScroll + 5,
        behavior: "auto",
      });
    };

    const interval = setInterval(autoScroll, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full overflow-hidden">
      <div
        ref={containerRef}
        className="flex overflow-x-scroll gap-4 sm:gap-6 pb-8 px-4 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {allTestimonials.map((testimonial, index) => (
          <div
            key={`${testimonial.id}-${index}`}
            className="flex-shrink-0 w-[280px] sm:w-[340px] md:w-[380px] bg-white border-2 border-blue-200 p-6 sm:p-8 rounded-3xl hover:border-blue-300 transition-all duration-300 group"
          >
            <div className="flex items-center mb-4 sm:mb-6">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold text-lg sm:text-xl mr-3 sm:mr-4 group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}
              >
                {testimonial.initials}
              </div>
              <div className="min-w-0">
                <h4
                  className={`font-bold text-base sm:text-lg bg-gradient-to-r ${testimonial.gradient} bg-clip-text text-transparent truncate`}
                >
                  {testimonial.name}
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">
                  {testimonial.role}
                </p>
              </div>
            </div>
            <div className="relative">
              <span
                className={`absolute -top-1 sm:-top-2 -left-1 sm:-left-2 text-4xl sm:text-6xl bg-gradient-to-br ${testimonial.gradient} bg-clip-text text-transparent opacity-20 font-serif`}
              >
                "
              </span>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed relative z-10 pl-4 sm:pl-6">
                {testimonial.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
