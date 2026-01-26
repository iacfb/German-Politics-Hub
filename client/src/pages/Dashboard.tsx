import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Vote, Newspaper, MessageSquareText, ChevronRight, Info } from "lucide-react";
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
            Beteilige dich an der deutschen Politik. Nimm an Umfragen teil, finde deine Partei im Wahl-O-Mat und bleib informiert.
          </motion.p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Wahl-O-Mat Card */}
          <motion.div variants={item} className="h-full">
            <Card className="h-full border-l-4 border-l-black hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center mb-4">
                  <Vote className="w-6 h-6 text-black" />
                </div>
                <CardTitle>Wahl-O-Mat</CardTitle>
                <CardDescription>Finde heraus, welche Partei am besten zu deinen Werten passt.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/quizzes">
                  <Button className="w-full bg-black hover:bg-black/80 text-white group">
                    Quiz starten <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Meinungscheck Card */}
          <motion.div variants={item} className="h-full">
            <Card className="h-full border-l-4 border-l-[#DD0000] hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-[#DD0000]/10 rounded-xl flex items-center justify-center mb-4">
                  <Vote className="w-6 h-6 text-[#DD0000]" />
                </div>
                <CardTitle>Meinungscheck</CardTitle>
                <CardDescription>Gib deine Stimme zu aktuellen Themen ab.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/polls">
                  <Button className="w-full bg-[#DD0000] hover:bg-[#DD0000]/90 text-white group">
                    Jetzt abstimmen <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* CivicChat AI Card */}
          <motion.div variants={item} className="h-full">
            <Card className="h-full border-l-4 border-l-[#FFCC00] hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-[#FFCC00]/10 rounded-xl flex items-center justify-center mb-4">
                  <MessageSquareText className="w-6 h-6 text-[#D4AA00]" />
                </div>
                <CardTitle>CivicChat AI</CardTitle>
                <CardDescription>Diskutiere politische Themen mit unserem KI-Assistenten.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/chat">
                  <Button className="w-full bg-[#FFCC00] hover:bg-[#FFCC00]/90 text-black group">
                    Chat starten <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Mit Politikern Debattieren Card */}
          <motion.div variants={item} className="h-full">
            <Card className="h-full border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                  <MessageSquareText className="w-6 h-6 text-purple-500" />
                </div>
                <CardTitle>Debattieren</CardTitle>
                <CardDescription>Tritt in den direkten Dialog mit KI-Repräsentanten bekannter Politiker.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/debate">
                  <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white group">
                    Debatte beitreten <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

           {/* Aktuelle Themen Card */}
           <motion.div variants={item} className="h-full lg:col-span-2">
            <Card className="h-full bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl">
              <div className="flex flex-col md:flex-row items-center">
                <div className="flex-1 p-8">
                  <div className="flex items-center gap-2 text-white/60 mb-2">
                    <Newspaper className="w-5 h-5" />
                    <span className="text-sm font-medium uppercase tracking-wider">Aktuelle Themen</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-display font-bold mb-4">
                    Bleib informiert über die neuesten politischen Entwicklungen und Projekte.
                  </h3>
                  <Link href="/news">
                    <Button variant="secondary" size="lg" className="group">
                      Artikel lesen <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Über uns Card */}
          <motion.div variants={item} className="h-full">
            <Card className="h-full border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Info className="w-6 h-6 text-blue-500" />
                </div>
                <CardTitle>Über uns</CardTitle>
                <CardDescription>Erfahre mehr über die Mission von VoiceUp.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/about">
                  <Button variant="outline" className="w-full group">
                    Mehr erfahren <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </Layout>
  );
}
