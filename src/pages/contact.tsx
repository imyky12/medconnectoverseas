"use client";

import type React from "react";

import { useState } from "react";
import { ORG_SOCIALS, FOUNDER_SOCIALS, activeLinks } from "../constants/social";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";

const SOCIAL_ICONS = {
  facebook: { Icon: Facebook, label: "Facebook" },
  twitter: { Icon: Twitter, label: "Twitter" },
  instagram: { Icon: Instagram, label: "Instagram" },
  linkedin: { Icon: Linkedin, label: "LinkedIn" },
} as const;

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormState({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-20  px-[10%] bg-[#041c44] text-white overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-[#041c44] via-[#0a2d6a] to-[#041c44]"></div>
            <div className="absolute inset-0 opacity-20">
              <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern
                    id="contact-pattern"
                    x="0"
                    y="0"
                    width="100"
                    height="100"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="1.5"
                      fill="rgba(255,255,255,0.2)"
                    />
                    <circle
                      cx="25"
                      cy="25"
                      r="1"
                      fill="rgba(255,255,255,0.2)"
                    />
                    <circle
                      cx="75"
                      cy="75"
                      r="1"
                      fill="rgba(255,255,255,0.2)"
                    />
                    <circle
                      cx="25"
                      cy="75"
                      r="1"
                      fill="rgba(255,255,255,0.2)"
                    />
                    <circle
                      cx="75"
                      cy="25"
                      r="1"
                      fill="rgba(255,255,255,0.2)"
                    />
                  </pattern>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="url(#contact-pattern)"
                />
              </svg>
            </div>

            {/* Animated elements */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl animate-pulse"></div>
            <div
              className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-blue-400/10 blur-3xl animate-pulse"
              style={{ animationDelay: "1s", animationDuration: "7s" }}
            ></div>
          </div>

          <div className="container px-4 md:px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-5xl font-bold mb-6">
                Contact Us
              </h1>
              <p className="text-xl text-blue-200 mb-8">
                Get in touch with the MedConnectsOverseas team. We're here to
                answer your questions and provide support.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="py-20  px-[10%]">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-bold text-[#041c44] mb-6">
                  Get In Touch
                </h2>
                <p className="text-gray-600 mb-8">
                  Have questions about MedConnectsOverseas or want to join our
                  community? Fill out the form and we'll get back to you as soon
                  as possible.
                </p>

                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="bg-[#041c44] p-2 rounded-full mr-4">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#041c44]">Email</h3>
                      <p className="text-gray-600">
                        info@medconnectsoverseas.com
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-[#041c44] p-2 rounded-full mr-4">
                      <Phone className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#041c44]">Phone</h3>
                      <p className="text-gray-600">+1 (123) 456-7890</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-[#041c44] p-2 rounded-full mr-4">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#041c44]">Location</h3>
                      <p className="text-gray-600">Tbilisi, Georgia</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="font-semibold text-[#041c44] mb-4">
                    Connect With Us
                  </h3>
                  {/* Only profiles that actually exist — src/constants/social.ts */}
                  {activeLinks(ORG_SOCIALS).length > 0 ? (
                    <div className="flex space-x-4">
                      {activeLinks(ORG_SOCIALS).map(([key, url]) => {
                        const { Icon, label } = SOCIAL_ICONS[key];
                        return (
                          <a
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="bg-[#041c44] p-2 rounded-full text-white hover:bg-[#041c44]/80 transition-colors"
                          >
                            <Icon className="h-5 w-5" />
                            <span className="sr-only">{label}</span>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <a
                      href="mailto:info@medconnectsoverseas.com"
                      className="inline-flex items-center gap-2 text-[#041c44] hover:underline"
                    >
                      <Mail className="h-5 w-5" />
                      info@medconnectsoverseas.com
                    </a>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl shadow-lg p-8"
              >
                {isSubmitted ? (
                  <div className="text-center py-8">
                    <div className="bg-green-100 text-green-700 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Send className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#041c44] mb-2">
                      Message Sent!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Thank you for reaching out. We'll get back to you as soon
                      as possible.
                    </p>
                    <Button
                      onClick={() => setIsSubmitted(false)}
                      className="bg-[#041c44] hover:bg-[#041c44]/90"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Name
                      </label>
                      <Input
                        id="name"
                        name="name"
                        value={formState.name}
                        onChange={handleChange}
                        required
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Email
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formState.email}
                        onChange={handleChange}
                        required
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="subject"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Subject
                      </label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formState.subject}
                        onChange={handleChange}
                        required
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Message
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formState.message}
                        onChange={handleChange}
                        required
                        className="w-full min-h-[120px]"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-[#041c44] hover:bg-[#041c44]/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Founder Section */}
        <section className="py-20  px-[10%] bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[#041c44] mb-4">
                Meet Our Founder
              </h2>
              <div className="h-1 w-20 bg-[#041c44] mx-auto"></div>
            </div>

            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl shadow-lg overflow-hidden"
              >
                <div className="grid md:grid-cols-2">
                  <div className="relative h-full min-h-[300px]">
                    <img
                      src="/images/founder.png"
                      alt="Astha Sengar - Founder of MedConnectsOverseas"
                      //   fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-[#041c44] mb-2">
                      Astha Sengar
                    </h3>
                    <p className="text-blue-600 font-medium mb-4">
                      Founder & Director
                    </p>
                    <p className="text-gray-600 mb-6">
                      Astha Sengar founded MedConnectsOverseas with a vision to
                      create a supportive community for medical students
                      worldwide. With her background in medicine and passion for
                      education, she has built a platform that prioritizes
                      academic excellence, well-being, and meaningful
                      connections.
                    </p>
                    <p className="text-gray-600 mb-6">
                      Under her leadership, MedConnectsOverseas has grown into a
                      thriving community that offers various activities,
                      resources, and support systems for medical students at all
                      stages of their journey.
                    </p>
                    {/* Her profiles appear here as soon as they are filled in
                        — src/constants/social.ts */}
                    <div className="flex items-center space-x-4">
                      {activeLinks(FOUNDER_SOCIALS["Astha Singh Sengar"] ?? {}).map(([key, url]) => {
                        const { Icon, label } = SOCIAL_ICONS[key];
                        return (
                          <a
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-[#041c44] hover:text-[#041c44]/80 transition-colors"
                          >
                            <Icon className="h-5 w-5" />
                            <span className="sr-only">{label}</span>
                          </a>
                        );
                      })}
                      <a
                        href="mailto:astha@medconnectsoverseas.com"
                        className="inline-flex items-center gap-2 text-[#041c44] hover:text-[#041c44]/80 transition-colors"
                      >
                        <Mail className="h-5 w-5" />
                        <span className="sr-only">Email Astha</span>
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
