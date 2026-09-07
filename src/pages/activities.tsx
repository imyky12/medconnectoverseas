import { Globe, Heart, BookOpen, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSiteContent, type ContentItem } from "@/hooks/useSiteContent";
import Navbar from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";

export default function ActivitiesPage() {
  const { content } = useSiteContent();

  // Icons stay in code — cycled by position, so adding an activity in the admin
  // never leaves a card without one.
  const ICONS = [Globe, BookOpen, Heart, Users];

  const activities = content.activity.map((a: ContentItem, i: number) => ({
    title: a.heading,
    description: a.body ?? '',
    icon: ICONS[i % ICONS.length],
    image: a.imageUrl || '/placeholder.svg',
  }));

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
              {/* This had no handler at all — it looked like a call to action
                  and did nothing when clicked. */}
              <Button asChild className="bg-white text-[#041c44] hover:bg-blue-100">
                <Link to="/events">
                  See upcoming events <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
