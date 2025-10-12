import { motion } from "framer-motion";
import {
  Calendar,
  BookOpen,
  Users,
  ChevronDown,
  Zap,
  Target,
  Eye,
  CheckCircle,
  Globe,
  Award,
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import NewsletterSignup from "@/components/newsletter-signup";
import TestimonialScroll from "@/components/testimonial-scroll";
import FAQSection from "@/components/faq-section";
import CoFounders from "@/components/co-founders";
import ActivitySlideshow from "@/components/activity-slideshow";
import StatisticsSection from "@/components/statistics-section";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-background.jpg"
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#041c44]/80 via-[#0a2d6a]/70 to-[#041c44]/80"></div>
        </div>

        <div className="absolute inset-0 z-10">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.4, 1, 0.4],
                scale: [1, 1.4, 1],
              }}
              transition={{
                duration: Math.random() * 4 + 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 z-10 opacity-30">
          <motion.div
            className="absolute top-20 left-10 w-64 h-64 sm:w-80 sm:h-80 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <div className="container relative z-20 px-4 sm:px-6 md:px-8 text-center text-white py-20 sm:py-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-6 sm:mb-8"
          >
            <div className="inline-block bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-cyan-400/30 mb-6 sm:mb-8">
              <span className="text-cyan-300 text-sm sm:text-base font-medium">
                Global Med Student Community
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-white via-cyan-200 to-blue-300 bg-clip-text text-transparent leading-tight px-4"
          >
            MedConnects Overseas
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-lg sm:text-xl md:text-2xl text-blue-200 mb-8 sm:mb-12 max-w-3xl mx-auto px-4 leading-relaxed"
          >
            Bridging borders, sharing experiences, and empowering medical
            students worldwide
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4"
          >
            <button
              onClick={() => navigate("/contact")}
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold flex items-center justify-center gap-2 group cursor-pointer border-2 border-white/20"
            >
              Join Our Community
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 group-hover:animate-pulse" />
            </button>
            <button
              onClick={() => navigate("/about")}
              className="w-full sm:w-auto bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 hover:border-white/50 transition-all transform hover:-translate-y-1 px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold flex items-center justify-center gap-2 group cursor-pointer"
            >
              Learn More
              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 rotate-[-90deg]" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-12 sm:mt-16 flex flex-wrap justify-center gap-6 sm:gap-8 text-blue-200"
          >
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
              <span className="text-sm sm:text-base font-medium">
                6000+ Students
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
              <span className="text-sm sm:text-base font-medium">
                3+ Countries
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
              <span className="text-sm sm:text-base font-medium">
                50+ Events
              </span>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 text-white z-20"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-xs sm:text-sm text-blue-200 font-medium">
              Scroll to explore
            </span>
            <ChevronDown className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
          </motion.div>
        </motion.div>
      </section>

      {/* Mission & Vision with Image on Right and animated background at top */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-[10%] bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-900 bg-clip-text text-transparent mb-4">
              Our Mission & Vision
            </h2>
            <div className="h-1 w-16 sm:w-20 md:w-24 bg-gradient-to-r from-blue-500 to-blue-700 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="bg-white border-2 border-blue-200 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl mr-3 sm:mr-4 shadow-md flex-shrink-0">
                    <Target className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent">
                    Mission
                  </h3>
                </div>
                <p className="text-base sm:text-lg text-gray-700 mb-4 sm:mb-6 font-medium">
                  Transparency, guidance, and opportunities for medical students
                  worldwide.
                </p>
                <ul className="space-y-2 sm:space-y-3">
                  <li className="flex items-start text-gray-700">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 mt-0.5 text-blue-600 flex-shrink-0" />
                    <span className="text-sm sm:text-base">
                      Provide clear, honest guidance to medical students
                    </span>
                  </li>
                  <li className="flex items-start text-gray-700">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 mt-0.5 text-blue-600 flex-shrink-0" />
                    <span className="text-sm sm:text-base">
                      Create opportunities for academic and professional growth
                    </span>
                  </li>
                  <li className="flex items-start text-gray-700">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 mt-0.5 text-blue-600 flex-shrink-0" />
                    <span className="text-sm sm:text-base">
                      Foster a global community of medical learners
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-white border-2 border-cyan-200 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl mr-3 sm:mr-4 shadow-md flex-shrink-0">
                    <Eye className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-700 bg-clip-text text-transparent">
                    Vision
                  </h3>
                </div>
                <p className="text-base sm:text-lg text-gray-700 mb-4 sm:mb-6 font-medium">
                  A world where medical students thrive academically, mentally,
                  and socially.
                </p>
                <ul className="space-y-2 sm:space-y-3">
                  <li className="flex items-start text-gray-700">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 mt-0.5 text-cyan-600 flex-shrink-0" />
                    <span className="text-sm sm:text-base">
                      Academic excellence through collaborative learning
                    </span>
                  </li>
                  <li className="flex items-start text-gray-700">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 mt-0.5 text-cyan-600 flex-shrink-0" />
                    <span className="text-sm sm:text-base">
                      Mental and physical well-being as a priority
                    </span>
                  </li>
                  <li className="flex items-start text-gray-700">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 mt-0.5 text-cyan-600 flex-shrink-0" />
                    <span className="text-sm sm:text-base">
                      Meaningful connections among students worldwide
                    </span>
                  </li>
                </ul>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative mt-8 md:mt-0"
            >
              <div className="absolute -top-4 sm:-top-6 md:-top-8 -right-4 sm:-right-6 md:-right-8 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 bg-gradient-to-br from-blue-400 via-cyan-400 to-blue-600 rounded-full opacity-30 blur-3xl animate-pulse"></div>
              <div
                className="absolute -top-2 sm:-top-3 md:-top-4 -right-2 sm:-right-3 md:-right-4 w-40 h-40 sm:w-56 sm:h-56 md:w-72 md:h-72 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl sm:rounded-3xl opacity-20 animate-spin"
                style={{ animationDuration: "20s" }}
              ></div>

              <div className="relative h-[300px] sm:h-[400px] md:h-[500px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl border-2 sm:border-4 border-white z-10">
                <img
                  src="/images/mission-vision.jpg"
                  alt="Students collaborating"
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-transparent to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Co-Founders with animated backgrounds handled inside component */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-[10%] bg-gradient-to-br from-white via-blue-50 to-white">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-900 bg-clip-text text-transparent mb-4">
              Meet the Co-Founders
            </h2>
            <p className="text-base sm:text-lg text-gray-700 max-w-3xl mx-auto font-medium px-4">
              The visionary leaders behind MedConnectsOverseas.
            </p>
            <div className="h-1 w-16 sm:w-20 md:w-24 bg-gradient-to-r from-blue-500 to-blue-700 mx-auto mt-4 sm:mt-6 rounded-full"></div>
          </div>
          <CoFounders />
        </div>
      </section>

      {/* Testimonials and FAQs */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-[10%] bg-gray-50">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#041c44] mb-4">
              What Our Community Says
            </h2>
            <div className="h-1 w-20 bg-[#041c44] mx-auto"></div>
          </div>
          <TestimonialScroll />
        </div>
      </section>

      {/* Activities: slideshow left, pointers right */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-[10%] bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-900 bg-clip-text text-transparent mb-4">
              Our Activities
            </h2>
            <div className="h-1 w-16 sm:w-20 md:w-24 bg-gradient-to-r from-blue-500 to-blue-700 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-center">
            <ActivitySlideshow />

            <div className="space-y-4 sm:space-y-5">
              {[
                {
                  title: "Exploring Georgia",
                  desc: "Culture trips and healthcare system exposure.",
                  color: "from-blue-500 to-blue-700",
                  bgColor: "from-blue-50 to-blue-100",
                },
                {
                  title: "Treasure Hunt",
                  desc: "Team challenges blending fun with knowledge.",
                  color: "from-cyan-500 to-blue-600",
                  bgColor: "from-cyan-50 to-blue-100",
                },
                {
                  title: "Trekking Adventures",
                  desc: "Outdoor wellness and resilience.",
                  color: "from-blue-600 to-cyan-600",
                  bgColor: "from-blue-50 to-cyan-100",
                },
                {
                  title: "Med Talks",
                  desc: "Talks with clinicians and educators.",
                  color: "from-blue-700 to-blue-900",
                  bgColor: "from-blue-100 to-blue-50",
                },
                {
                  title: "Free Webinars",
                  desc: "Monthly virtual learning.",
                  color: "from-cyan-600 to-blue-700",
                  bgColor: "from-cyan-100 to-blue-50",
                },
                {
                  title: "Study Sessions",
                  desc: "Peer study circles and mentorship.",
                  color: "from-blue-600 to-blue-800",
                  bgColor: "from-blue-50 to-white",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  whileHover={{ x: 8, scale: 1.02 }}
                  className={`relative p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br ${item.bgColor} border-2 border-blue-200 hover:border-blue-300 transition-all duration-300 group overflow-hidden`}
                >
                  <div
                    className={`absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-gradient-to-b ${item.color} group-hover:w-1.5 sm:group-hover:w-2 transition-all duration-300`}
                  ></div>
                  <h3
                    className={`text-lg sm:text-xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent mb-1 sm:mb-2`}
                  >
                    {item.title}
                  </h3>
                  <p className="text-gray-700 text-sm sm:text-base">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Impact numbers (white, animated) */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-[10%] bg-gradient-to-br from-[#041c44] via-[#0a2d6a] to-[#041c44]">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Our Impact in Numbers
            </h2>
            <div className="h-1 w-16 sm:w-20 bg-white mx-auto rounded-full"></div>
          </div>
          <StatisticsSection />
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-[10%] bg-gradient-to-br from-white via-blue-50 to-cyan-50">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-900 bg-clip-text text-transparent mb-4">
              Med Nexus Newsletter
            </h2>
            <div className="h-1 w-16 sm:w-20 md:w-24 bg-gradient-to-r from-blue-500 to-blue-700 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -top-4 sm:-top-6 md:-top-8 -left-4 sm:-left-6 md:-left-8 w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 border-4 border-blue-400/30 rounded-2xl sm:rounded-3xl rotate-6"></div>
              <div className="absolute -bottom-3 sm:-bottom-4 md:-bottom-6 -right-3 sm:-right-4 md:-right-6 w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 border-4 border-cyan-400/30 rounded-2xl sm:rounded-3xl -rotate-6"></div>

              <div className="relative h-[300px] sm:h-[350px] md:h-[450px] rounded-2xl sm:rounded-3xl overflow-hidden border-2 sm:border-4 border-white z-10">
                <img
                  src="/images/newsletter-collage.png"
                  alt="Med Nexus Newsletter"
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/30 via-transparent to-transparent" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-white to-blue-50 p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border-2 border-blue-200"
            >
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-3 sm:mb-4">
                Subscribe to Med Nexus
              </h3>
              <p className="mb-6 sm:mb-8 text-gray-700 text-base sm:text-lg">
                Get monthly updates, events, and highlights.
              </p>
              <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <li className="flex items-center group">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2 sm:p-2.5 rounded-lg sm:rounded-xl mr-3 sm:mr-4 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <span className="text-gray-700 font-medium text-sm sm:text-base">
                    Upcoming events and activities
                  </span>
                </li>
                <li className="flex items-center group">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 sm:p-2.5 rounded-lg sm:rounded-xl mr-3 sm:mr-4 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <span className="text-gray-700 font-medium text-sm sm:text-base">
                    Educational resources and study tips
                  </span>
                </li>
                <li className="flex items-center group">
                  <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 sm:p-2.5 rounded-lg sm:rounded-xl mr-3 sm:mr-4 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <span className="text-gray-700 font-medium text-sm sm:text-base">
                    Community stories and opportunities
                  </span>
                </li>
              </ul>
              <NewsletterSignup />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-[10%] bg-white">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#041c44] mb-4">
              Frequently Asked Questions
            </h2>
            <div className="h-1 w-20 bg-[#041c44] mx-auto"></div>
          </div>
          <FAQSection />
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Home;
