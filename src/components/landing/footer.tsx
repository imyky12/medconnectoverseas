import { Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { ORG_SOCIALS, activeLinks } from "../../constants/social";

const SOCIAL_ICONS = {
  facebook: { Icon: Facebook, label: "Facebook" },
  twitter: { Icon: Twitter, label: "Twitter" },
  instagram: { Icon: Instagram, label: "Instagram" },
  linkedin: { Icon: Linkedin, label: "LinkedIn" },
} as const;

export default function Footer() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res: any = await api.post("/newsletter/subscribe", { email, source: "footer" });
      if (res?.success) setDone(res.message || "You are on the list.");
      else setError(res?.message || "Could not sign you up.");
    } catch (err: any) {
      setError(err?.message || "Could not sign you up.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer className="bg-[#041c44] text-white">
      <div className="container mx-auto px-4 py-12 md:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-4">
            <h3 className="text-xl font-bold">MedConnectsOverseas</h3>
            <p className="text-blue-200">
              A student led, student oriented community connecting medical
              students worldwide.
            </p>
            {/* Only profiles that actually exist — see src/constants/social.ts */}
            {activeLinks(ORG_SOCIALS).length > 0 && (
              <div className="flex space-x-4">
                {activeLinks(ORG_SOCIALS).map(([key, url]) => {
                  const { Icon, label } = SOCIAL_ICONS[key];
                  return (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-white hover:text-blue-300 transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                      <span className="sr-only">{label}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/activities"
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  Activities
                </Link>
              </li>
              <li>
                <Link
                  to="/newsletter"
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  Newsletter
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <Mail className="h-5 w-5 mr-2 text-blue-300" />
                <a
                  href="mailto:info@medconnectsoverseas.com"
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  info@medconnectsoverseas.com
                </a>
              </li>
            </ul>
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">
                Subscribe to our newsletter
              </h4>
              {/* This form had no handler at all — it submitted nowhere and
                  reloaded the page. It now posts to the same endpoint as the
                  newsletter page. */}
              {done ? (
                <p className="text-sm font-medium text-blue-200">{done}</p>
              ) : (
                <form onSubmit={subscribe} className="flex">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="px-3 py-2 bg-white/10 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-white w-full"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="bg-blue-300 text-[#041c44] px-4 py-2 rounded-r-md font-medium hover:bg-blue-200 transition-colors disabled:opacity-60"
                  >
                    {busy ? "…" : "Subscribe"}
                  </button>
                </form>
              )}
              {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 mt-8 pt-8 text-center text-blue-200 text-sm">
          <p>
            &copy; {new Date().getFullYear()} MedConnectsOverseas. All rights
            reserved.
          </p>
          {/* Legal pages belong in the footer on every page, not tucked away —
              this is where people look for them. */}
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms &amp; Conditions
            </Link>
            <span aria-hidden className="text-white/30">|</span>
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
