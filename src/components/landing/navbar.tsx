"use client";

import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Menu, X, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "./auth-modal";
import { Button } from "../ui/button";

export default function Navbar({ hideLinks = false }: { hideLinks?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const toggleMenu = () => setIsOpen((p) => !p);

  const menuVariants = {
    closed: {
      opacity: 0,
      height: 0,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    open: {
      opacity: 1,
      height: "auto",
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  };

  const links = [
    { name: "Home", href: "/" },
    { name: "Activities", href: "/activities" },
    { name: "Newsletter", href: "/newsletter" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <>
      <header className="fixed w-full z-50 bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/"
              className="flex items-center"
              aria-label="MedConnectsOverseas Home"
            >
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <img
                  src="/images/logo.png"
                  alt="MedConnectsOverseas Logo"
                  width={120}
                  height={40}
                />
              </motion.div>
            </Link>

            {!hideLinks && (
              <nav className="hidden md:flex items-center space-x-8">
                {links.map((link, index) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Link
                      to={link.href}
                      className="text-gray-700 hover:text-[#041c44] font-medium transition-colors"
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
              </nav>
            )}

            {!hideLinks && (
              <div className="hidden md:flex items-center space-x-3">
                {/* Explore Events — always visible */}
                <Link to="/events">
                  <Button
                    variant="outline"
                    className="flex items-center gap-1.5 border-[#041c44] text-[#041c44] hover:bg-[#041c44] hover:text-white rounded-full px-4"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Explore Events
                  </Button>
                </Link>

                {isAuthenticated ? (
                  <div className="flex items-center space-x-3">
                    <Link to={user?.isOnboardingComplete ? "/dashboard" : "/onboarding"}>
                      <Button variant="outline" className="border-[#041c44] text-[#041c44] hover:bg-[#041c44] hover:text-white">
                        Dashboard
                      </Button>
                    </Link>
                    <Button onClick={logout} variant="ghost" className="text-gray-500 hover:text-red-600">
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="bg-[#041c44] hover:bg-[#031533] text-white px-6 rounded-full"
                  >
                    Log In / Sign Up
                  </Button>
                )}
              </div>
            )}

            <div className="md:hidden">
              <button
                onClick={toggleMenu}
                className="text-gray-700 hover:text-[#041c44] focus:outline-none"
              >
                {isOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants as Variants}
              className="md:hidden bg-white border-t"
            >
              <div className="container mx-auto px-4 py-4 space-y-4">
                {!hideLinks && links.map((link, index) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      to={link.href}
                      className="block text-gray-700 hover:text-[#041c44] font-medium py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
                
                {/* Explore Events in mobile menu */}
                <Link
                  to="/events"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 text-[#041c44] font-semibold py-2"
                >
                  <CalendarDays className="h-4 w-4" /> Explore Events
                </Link>

                <div className="pt-4 border-t border-gray-100">
                  {isAuthenticated ? (
                    <div className="flex flex-col space-y-3">
                      <Link 
                        to={user?.isOnboardingComplete ? "/dashboard" : "/onboarding"}
                        onClick={() => setIsOpen(false)}
                        className="w-full"
                      >
                        <Button className="w-full border border-[#041c44] text-[#041c44] bg-white hover:bg-gray-50">
                          {user?.isOnboardingComplete ? "Dashboard" : "Finish Onboarding"}
                        </Button>
                      </Link>
                      <Button onClick={() => { logout(); setIsOpen(false); }} variant="outline" className="w-full text-red-600 border-red-200">
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => { setIsAuthModalOpen(true); setIsOpen(false); }}
                      className="w-full bg-[#041c44] text-white"
                    >
                      Log In / Sign Up
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
}
