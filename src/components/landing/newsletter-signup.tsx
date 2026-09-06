"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../../services/api";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState("");

  /**
   * Previously a `setTimeout` that thanked the person and stored nothing. Every
   * address was discarded the moment the tab closed.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res: any = await api.post("/newsletter/subscribe", {
        email,
        source: "newsletter-page",
      });
      if (res?.success) {
        setIsSubmitted(true);
        setEmail("");
      } else {
        setError(res?.message || "We could not sign you up. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "We could not sign you up. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {isSubmitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl border-2 border-green-200"
        >
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-full mb-3">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent mb-2">
            Thank you for subscribing!
          </h3>
          <p className="text-gray-700">
            You'll receive our next issue of Med Nexus in your inbox.
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white border-2 border-blue-200 focus:border-blue-400 text-gray-800 placeholder:text-gray-500 h-12 rounded-xl px-4 transition-all duration-300"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 h-12 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  ⟳
                </motion.div>
                Subscribing...
              </span>
            ) : (
              "Subscribe to Med Nexus"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
