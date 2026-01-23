import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Vote, Newspaper, MessageSquareText, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user } = useAuth();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Layout>
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <section className="space-y-2">
          <motion.h1 variants={item} className="text-4xl font-display font-bold text-foreground">
            Willkommen{user?.firstName ? `, ${user.firstName}` : ''}.
          </motion.h1>
          <motion.p variants={item} className="text-xl text-muted-foreground max-w-2xl">
            Engage with German politics. Participate in polls, take quizzes to find your party match, and stay informed.
          </motion.p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quiz Card */}
          <motion.div variants={item} className="h-full">
            <Card className="h-full border-l-4 border-l-black hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center mb-4">
                  <Vote className="w-6 h-6 text-black" />
                </div>
                <CardTitle>Political Compass</CardTitle>
                <CardDescription>Find out which party aligns with your values.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/quizzes">
                  <Button className="w-full bg-black hover:bg-black/80 text-white group">
                    Start Quiz <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Poll Card */}
          <motion.div variants={item} className="h-full">
            <Card className="h-full border-l-4 border-l-[#DD0000] hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-[#DD0000]/10 rounded-xl flex items-center justify-center mb-4">
                  <Vote className="w-6 h-6 text-[#DD0000]" />
                </div>
                <CardTitle>Current Polls</CardTitle>
                <CardDescription>Voice your opinion on pressing matters.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/polls">
                  <Button className="w-full bg-[#DD0000] hover:bg-[#DD0000]/90 text-white group">
                    Vote Now <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Chat Card */}
          <motion.div variants={item} className="h-full">
            <Card className="h-full border-l-4 border-l-[#FFCC00] hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-[#FFCC00]/10 rounded-xl flex items-center justify-center mb-4">
                  <MessageSquareText className="w-6 h-6 text-[#D4AA00]" />
                </div>
                <CardTitle>Politik AI</CardTitle>
                <CardDescription>Discuss political topics with our AI assistant.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/chat">
                  <Button className="w-full bg-[#FFCC00] hover:bg-[#FFCC00]/90 text-black group">
                    Start Chat <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

           {/* News Card - Spans full width on mobile, else fits grid */}
           <motion.div variants={item} className="h-full lg:col-span-3">
            <Card className="h-full bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl">
              <div className="flex flex-col md:flex-row items-center">
                <div className="flex-1 p-8">
                  <div className="flex items-center gap-2 text-white/60 mb-2">
                    <Newspaper className="w-5 h-5" />
                    <span className="text-sm font-medium uppercase tracking-wider">Aktuelles</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-display font-bold mb-4">
                    Stay informed with the latest political developments and projects.
                  </h3>
                  <Link href="/news">
                    <Button variant="secondary" size="lg" className="group">
                      Read Articles <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
                <div className="w-full md:w-1/3 h-48 md:h-auto bg-white/5 relative overflow-hidden">
                   {/* Abstract graphic */}
                   <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-transparent z-10" />
                   {/* Using a pattern instead of an image for reliability */}
                   <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </Layout>
  );
}
