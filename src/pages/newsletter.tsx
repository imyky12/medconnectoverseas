import { Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import NewsletterSignup from "@/components/landing/newsletter-signup";

export default function NewsletterPage() {
  const newsletters = [
    {
      title: "Medical Education Trends",
      date: "April 2023",
      description:
        "Exploring the latest trends in medical education and how they impact student learning.",
      image: "/images/newsletter-1.jpg",
    },
    {
      title: "Student Wellness Special",
      date: "March 2023",
      description:
        "A focus on mental health resources and wellness practices for medical students.",
      image: "/images/newsletter-2.jpg",
    },
    {
      title: "Clinical Rotations Guide",
      date: "February 2023",
      description:
        "Tips and advice for making the most of your clinical rotations experience.",
      image: "/images/newsletter-3.jpg",
    },
  ];

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
                    id="newsletter-pattern"
                    x="0"
                    y="0"
                    width="80"
                    height="80"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle
                      cx="40"
                      cy="40"
                      r="3"
                      fill="rgba(255,255,255,0.1)"
                    />
                  </pattern>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="url(#newsletter-pattern)"
                />
              </svg>
            </div>

            {/* Animated elements */}
            <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl animate-pulse"></div>
            <div
              className="absolute bottom-1/4 left-1/3 w-48 h-48 rounded-full bg-blue-400/10 blur-3xl animate-pulse"
              style={{ animationDelay: "1s", animationDuration: "7s" }}
            ></div>
          </div>

          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-3xl md:text-5xl font-bold mb-6">
                  Med Nexus Newsletter
                </h1>
                <p className="text-xl text-blue-200 mb-8">
                  Stay informed and updated with our monthly newsletter
                  featuring the latest medical education news, upcoming events,
                  and community highlights.
                </p>
                <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                  <h3 className="text-xl font-bold mb-4">
                    Subscribe to Med Nexus
                  </h3>
                  <NewsletterSignup />
                </div>
              </div>
              <div className="relative h-[400px] rounded-xl overflow-hidden shadow-xl bg-white/5 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center p-8">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-blue-300" />
                  <h3 className="text-2xl font-bold mb-2">Med Nexus</h3>
                  <p className="text-blue-200">
                    Your monthly dose of medical education insights
                  </p>
                </div>
                <div className="absolute inset-0 border border-white/20 rounded-xl"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-500/10"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Issues */}
        <section className="py-20  px-[10%]">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold text-[#041c44] mb-12 text-center">
              Recent Issues
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              {newsletters.map((newsletter, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-48">
                    <img
                      src={newsletter.image || "/placeholder.svg"}
                      alt={newsletter.title}
                      //   fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center text-gray-500 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span className="text-sm">{newsletter.date}</span>
                    </div>
                    <h3 className="text-xl font-bold text-[#041c44] mb-2">
                      {newsletter.title}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {newsletter.description}
                    </p>
                    <Button className="w-full bg-[#041c44] hover:bg-[#041c44]/90">
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Archive */}
        <section className="py-20  px-[10%] bg-gray-50">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold text-[#041c44] mb-12 text-center">
              Newsletter Archive
            </h2>

            <div className="max-w-3xl mx-auto">
              <div className="space-y-4">
                {[2023, 2022, 2021].map((year) => (
                  <div key={year} className="bg-white rounded-lg shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h3 className="text-xl font-bold text-[#041c44]">
                        {year}
                      </h3>
                    </div>
                    <div className="divide-y">
                      {[
                        "December",
                        "November",
                        "October",
                        "September",
                        "August",
                        "July",
                        "June",
                        "May",
                        "April",
                        "March",
                        "February",
                        "January",
                      ].map((month) => (
                        <div
                          key={`${year}-${month}`}
                          className="px-6 py-3 flex justify-between items-center hover:bg-gray-50"
                        >
                          <span className="text-gray-700">
                            {month} {year}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#041c44]"
                          >
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
