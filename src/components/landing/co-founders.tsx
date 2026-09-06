"use client";

import { motion } from "framer-motion";
import { Linkedin, Twitter, Mail } from "lucide-react";
import { FOUNDER_SOCIALS } from "../../constants/social";

interface CoFounder {
  name: string;
  role: string;
  description: string;
  image: string;
  linkedin?: string;
  twitter?: string;
  email?: string;
}

export default function CoFounders() {
  const coFounders: CoFounder[] = [
    {
      name: "Astha Singh Sengar",
      role: "Co-Founder & CTO",
      description:
        "Astha founded MedConnectsOverseas with a vision to build a supportive community for medical students worldwide.",
      image: "/images/founder.png",
      linkedin: FOUNDER_SOCIALS["Astha Singh Sengar"]?.linkedin,
      twitter: FOUNDER_SOCIALS["Astha Singh Sengar"]?.twitter,
      email: "astha@medconnectsoverseas.com",
    },
    {
      name: "Bhavy Gaba",
      role: "Co-Founder & CEO",
      description:
        "Bhavy leads curriculum and mentorship initiatives, ensuring the highest academic standards and student success.",
      image: "/images/founder2.png",
      linkedin: FOUNDER_SOCIALS["Bhavy Gaba"]?.linkedin,
      twitter: FOUNDER_SOCIALS["Bhavy Gaba"]?.twitter,
      email: "bhavy@medconnectsoverseas.com",
    },
  ];

  return (
    <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 max-w-6xl mx-auto">
      {coFounders.map((founder, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: index * 0.2 }}
          viewport={{ once: true }}
          whileHover={{ y: -8 }}
          className="relative group"
        >
          <div className="absolute -top-4 sm:-top-6 md:-top-8 -left-4 sm:-left-6 md:-left-8 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 border-4 border-blue-400/30 rounded-2xl sm:rounded-3xl rotate-12 group-hover:rotate-45 transition-transform duration-700"></div>
          <div className="absolute -bottom-2 sm:-bottom-3 md:-bottom-4 -right-2 sm:-right-3 md:-right-4 w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 border-4 border-cyan-400/30 rounded-2xl sm:rounded-3xl -rotate-12 group-hover:-rotate-45 transition-transform duration-700"></div>
          <div className="absolute top-1/2 left-0 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-to-r from-blue-500/10 to-transparent rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="absolute top-1/4 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-l from-cyan-500/10 to-transparent rounded-full group-hover:scale-150 transition-transform duration-500 delay-100"></div>

          <div className="relative z-10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg sm:shadow-xl bg-white border-2 border-blue-100 group-hover:shadow-2xl group-hover:border-blue-200 transition-all duration-500">
            <div className="flex flex-col">
              <div className="relative h-64 sm:h-72 md:h-80 overflow-hidden">
                <img
                  src={founder.image || "/placeholder.svg"}
                  alt={founder.name}
                  className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 via-transparent to-transparent group-hover:from-blue-900/60 transition-all duration-500" />
              </div>

              <div className="p-6 sm:p-8 bg-gradient-to-br from-white to-blue-50/50">
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-2">
                  {founder.name}
                </h3>
                <p className="text-cyan-600 font-semibold text-base sm:text-lg mb-4">
                  {founder.role}
                </p>
                <p className="text-gray-700 text-sm sm:text-base mb-6 leading-relaxed">
                  {founder.description}
                </p>
                <div className="flex gap-3 sm:gap-4">
                  {founder.linkedin && (
                    <a
                      href={founder.linkedin}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-2.5 sm:p-3 rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110"
                      aria-label={`${founder.name} LinkedIn`}
                    >
                      <Linkedin className="h-4 w-4 sm:h-5 sm:w-5" />
                    </a>
                  )}
                  {founder.twitter && (
                    <a
                      href={founder.twitter}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white p-2.5 sm:p-3 rounded-lg sm:rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110"
                      aria-label={`${founder.name} Twitter`}
                    >
                      <Twitter className="h-4 w-4 sm:h-5 sm:w-5" />
                    </a>
                  )}
                  {founder.email && (
                    <a
                      href={`mailto:${founder.email}`}
                      className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-2.5 sm:p-3 rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-cyan-700 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110"
                      aria-label={`${founder.name} Email`}
                    >
                      <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
