"use client";

import type React from "react";

import { useState } from "react";
import { SOCIAL_ICONS } from "../constants/social";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, Linkedin, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import { api } from "../services/api";
import { useSiteContent, contactDetails, socialLinks } from "../hooks/useSiteContent";

export default function ContactPage() {
  const { content } = useSiteContent();
  const founders = content.founder;
  // Address, phone, place and every social profile are settings an admin edits
  // from the dashboard. Anything left blank is not drawn at all.
  const contact = contactDetails(content);
  const socials = socialLinks(content);

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

  const [submitError, setSubmitError] = useState("");
  const [ticketId, setTicketId] = useState("");

  /**
   * This used to be a `setTimeout` that showed "Message Sent!" and did nothing
   * else — no request, no record, no email. Every enquiry was lost, and the
   * sender was told the opposite. It now posts to a real endpoint, and only
   * claims success when the server says so.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res: any = await api.post("/contact", formState);
      if (res?.success) {
        setTicketId(res.data?.ticketId ?? "");
        setIsSubmitted(true);
        setFormState({ name: "", email: "", subject: "", message: "" });
      } else {
        setSubmitError(res?.message || "We could not send your message. Please try again.");
      }
    } catch (err: any) {
      setSubmitError(err?.message || "We could not send your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
                  {contact.email && (
                    <div className="flex items-start">
                      <div className="mr-4 rounded-full bg-[#041c44] p-2">
                        <Mail className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#041c44]">Email</h3>
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-gray-600 hover:text-[#041c44] hover:underline"
                        >
                          {contact.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {contact.phone && (
                    <div className="flex items-start">
                      <div className="mr-4 rounded-full bg-[#041c44] p-2">
                        <Phone className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#041c44]">Phone</h3>
                        <a
                          href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
                          className="text-gray-600 hover:text-[#041c44] hover:underline"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {contact.location && (
                    <div className="flex items-start">
                      <div className="mr-4 rounded-full bg-[#041c44] p-2">
                        <MapPin className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#041c44]">Location</h3>
                        <p className="text-gray-600">{contact.location}</p>
                      </div>
                    </div>
                  )}
                </div>

                {socials.length > 0 && (
                  <div className="mt-8">
                    <h3 className="mb-4 font-semibold text-[#041c44]">
                      Connect With Us
                    </h3>
                    {/* Only the profiles an admin has filled in. */}
                    <div className="flex flex-wrap gap-4">
                      {socials.map(([key, url]) => {
                        const { Icon, label } = SOCIAL_ICONS[key];
                        return (
                          <a
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noreferrer noopener"
                            title={label}
                            className="rounded-full bg-[#041c44] p-2 text-white transition-colors hover:bg-[#041c44]/80"
                          >
                            <Icon className="h-5 w-5" />
                            <span className="sr-only">{label}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                    <p className="text-gray-600 mb-2">
                      Thank you for reaching out. We usually reply within 2
                      working days, and a copy is on its way to your inbox.
                    </p>
                    {/* Quoted so the sender has something to refer to — and so
                        "it was sent" is backed by a real record, not a claim. */}
                    {ticketId && (
                      <p className="text-gray-500 text-sm mb-6">
                        Your reference is{" "}
                        <span className="font-mono font-semibold text-[#041c44]">{ticketId}</span>
                      </p>
                    )}
                    <Button
                      onClick={() => setIsSubmitted(false)}
                      className="bg-[#041c44] hover:bg-[#041c44]/90"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {submitError && (
                      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {submitError}
                      </p>
                    )}
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

            {/* Driven by the same records as the home page. It previously
                hardcoded one founder, so Bhavy was simply missing here. */}
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
              {founders.map((f, i) => (
                <motion.div
                  key={f._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex flex-col overflow-hidden rounded-xl bg-white shadow-lg"
                >
                  <div className="h-64 overflow-hidden bg-gray-100">
                    <img
                      src={f.imageUrl || "/images/founder.png"}
                      alt={`${f.heading} — ${f.subheading ?? "Co-founder"}`}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-xl font-bold text-[#041c44]">{f.heading}</h3>
                    {f.subheading && (
                      <p className="mt-1 font-medium text-blue-600">{f.subheading}</p>
                    )}
                    {f.body && <p className="mt-3 flex-1 text-gray-600">{f.body}</p>}
                    <div className="mt-5 flex items-center space-x-4">
                      {f.linkedinUrl && (
                        <a href={f.linkedinUrl} target="_blank" rel="noreferrer noopener"
                           className="text-[#041c44] transition-colors hover:text-[#041c44]/80">
                          <Linkedin className="h-5 w-5" />
                          <span className="sr-only">{f.heading} on LinkedIn</span>
                        </a>
                      )}
                      {f.twitterUrl && (
                        <a href={f.twitterUrl} target="_blank" rel="noreferrer noopener"
                           className="text-[#041c44] transition-colors hover:text-[#041c44]/80">
                          <Twitter className="h-5 w-5" />
                          <span className="sr-only">{f.heading} on Twitter</span>
                        </a>
                      )}
                      {f.email && (
                        <a href={`mailto:${f.email}`}
                           className="text-[#041c44] transition-colors hover:text-[#041c44]/80">
                          <Mail className="h-5 w-5" />
                          <span className="sr-only">Email {f.heading}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
