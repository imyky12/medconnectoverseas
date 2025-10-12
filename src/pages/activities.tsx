import { ArrowRight, Globe, Heart, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Link } from "react-router-dom";

export default function ActivitiesPage() {
  const activities = [
    {
      title: "Exploring Georgia",
      description:
        "Discover the beautiful landscapes and rich culture of Georgia with fellow medical students.",
      icon: Globe,
      link: "/activities/exploring-georgia",
      image: "/images/exploring-georgia.jpg",
    },
    {
      title: "Treasure Hunt",
      description:
        "Engage in exciting treasure hunt competitions that combine fun with medical knowledge.",
      icon: BookOpen,
      link: "/activities/treasure-hunt",
      image: "/images/treasure-hunt.jpg",
    },
    {
      title: "Trekking Adventures",
      description:
        "Join our trekking expeditions to promote physical well-being and build lasting connections.",
      icon: Heart,
      link: "/activities/trekking",
      image: "/images/trekking.jpg",
    },
    {
      title: "Med Talks",
      description:
        "Attend insightful talks by medical professionals and experts in various healthcare fields.",
      icon: Users,
      link: "/activities/med-talks",
      image: "/images/med-talks.jpg",
    },
    {
      title: "Free Webinars",
      description:
        "Participate in our free educational webinars covering diverse medical topics and career guidance.",
      icon: Globe,
      link: "/activities/webinars",
      image: "/images/webinars.jpg",
    },
    {
      title: "Study Sessions",
      description:
        "Join collaborative study sessions designed to enhance academic performance and knowledge sharing.",
      icon: BookOpen,
      link: "/activities/study-sessions",
      image: "/images/study-sessions.jpg",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-20  px-[10%] bg-[#041c44] text-white overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-[#041c44] via-[#0a2d6a] to-[#041c44]"></div>
            <div className="absolute inset-0 opacity-20">
              <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern
                    id="activities-pattern"
                    x="0"
                    y="0"
                    width="100"
                    height="100"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M0 0 L20 0 L20 20 L0 20 Z"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="url(#activities-pattern)"
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
                Our Activities
              </h1>
              <p className="text-xl text-blue-200 mb-8">
                Explore the diverse range of activities we organize to promote
                academic excellence, well-being, and community building.
              </p>
            </div>
          </div>
        </section>

        {/* Activities List */}
        <section className="py-20  px-[10%]">
          <div className="container px-4 md:px-6">
            <div className="grid gap-12">
              {activities.map((activity, index) => (
                <div
                  key={index}
                  className={`grid md:grid-cols-2 gap-8 items-center ${
                    index % 2 === 1 ? "md:flex-row-reverse" : ""
                  }`}
                >
                  <div className="relative h-[300px] rounded-xl overflow-hidden shadow-xl">
                    <img
                      src={activity.image || "/placeholder.svg"}
                      alt={activity.title}
                      //   fill
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-[#041c44] rounded-full flex items-center justify-center">
                      <activity.icon className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#041c44]">
                      {activity.title}
                    </h2>
                    <p className="text-gray-600 text-lg">
                      {activity.description}
                    </p>
                    <div className="pt-4">
                      <Button
                        asChild
                        className="bg-[#041c44] hover:bg-[#041c44]/90"
                      >
                        <Link to={activity.link}>
                          Learn More
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20  px-[10%] bg-[#041c44] text-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-6">
                Join Our Next Activity
              </h2>
              <p className="text-xl text-blue-200 mb-8">
                Don't miss out on our upcoming events and activities. Join
                MedConnectsOverseas today!
              </p>
              <Button className="bg-white text-[#041c44] hover:bg-blue-100">
                Register Now
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
