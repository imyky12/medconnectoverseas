import { Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#041c44] text-white">
      <div className="container mx-auto px-4 py-12 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold">MedConnectsOverseas</h3>
            <p className="text-blue-200">
              A student led, student oriented community connecting medical
              students worldwide.
            </p>
            <div className="flex space-x-4">
              <Link
                to="#"
                className="text-white hover:text-blue-300 transition-colors"
              >
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link
                to="#"
                className="text-white hover:text-blue-300 transition-colors"
              >
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link
                to="#"
                className="text-white hover:text-blue-300 transition-colors"
              >
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link
                to="#"
                className="text-white hover:text-blue-300 transition-colors"
              >
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Link>
            </div>
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
                  to="/about"
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  About Us
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
            <h3 className="text-lg font-semibold mb-4">Activities</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/activities/exploring-georgia"
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  Exploring Georgia
                </Link>
              </li>
              <li>
                <Link
                  to="/activities/treasure-hunt"
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  Treasure Hunt
                </Link>
              </li>
              <li>
                <Link
                  to="/activities/trekking"
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  Trekking Adventures
                </Link>
              </li>
              <li>
                <Link
                  to="/activities/med-talks"
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  Med Talks
                </Link>
              </li>
              <li>
                <Link
                  to="/activities/webinars"
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  Free Webinars
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
              <form className="flex">
                <input
                  type="email"
                  placeholder="Your email"
                  className="px-3 py-2 bg-white/10 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-white w-full"
                />
                <button
                  type="submit"
                  className="bg-blue-300 text-[#041c44] px-4 py-2 rounded-r-md font-medium hover:bg-blue-200 transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 mt-8 pt-8 text-center text-blue-200 text-sm">
          <p>
            &copy; {new Date().getFullYear()} MedConnectsOverseas. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
