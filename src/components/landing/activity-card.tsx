"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ActivityCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  link: string;
  index: number;
  imagePath?: string;
}

export default function ActivityCard({
  title,
  description,
  icon: Icon,
  link,
  index,
  imagePath,
}: ActivityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow group"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={imagePath || "/placeholder.svg?height=200&width=400"}
          alt={title}
          //   fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
          <div className="p-4">
            <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-start mb-4">
          <div className="w-10 h-10 bg-[#041c44] rounded-full flex items-center justify-center mr-3 shrink-0">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <p className="text-gray-600">{description}</p>
        </div>
        <Link
          to={link}
          className="inline-flex items-center text-[#041c44] font-medium hover:underline group-hover:translate-x-1 transition-transform"
        >
          Learn more
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
      <div className="h-1 bg-[#041c44]"></div>
    </motion.div>
  );
}
