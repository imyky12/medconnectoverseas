"use client";

import { useEffect, useRef } from "react";
import { useSiteContent } from "@/hooks/useSiteContent";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  initials: string;
  /** A photograph when the admin added one; initials are the fallback. */
  imageUrl?: string;
  content: string;
  gradient: string;
}

export default function TestimonialScroll() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { content } = useSiteContent();

  /**
   * Gradients are decoration, not data — an admin should never have to pick one.
   * Cycled by position so the wall stays varied however many there are.
   */
  const GRADIENTS = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-red-500',
  ];

  const testimonials: Testimonial[] = content.testimonial.map((t, i) => ({
    id: t._id,
    name: t.heading,
    role: t.subheading ?? '',
    // Only used when there is no photograph.
    initials: t.heading.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
    imageUrl: t.imageUrl,
    content: t.body ?? '',
    gradient: GRADIENTS[i % GRADIENTS.length],
  }));


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

  // After the hooks, never before: an early return above them would make the
  // hook order depend on whether the fetch had come back yet.
  if (testimonials.length === 0) return null;

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
              {/* A photograph when there is one; initials otherwise, so a
                  testimonial without a picture still looks deliberate. */}
              {testimonial.imageUrl ? (
                <img
                  src={testimonial.imageUrl}
                  alt={testimonial.name}
                  loading="lazy"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover mr-3 sm:mr-4 group-hover:scale-110 transition-transform duration-300 flex-shrink-0"
                />
              ) : (
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold text-lg sm:text-xl mr-3 sm:mr-4 group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}
                >
                  {testimonial.initials}
                </div>
              )}
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
