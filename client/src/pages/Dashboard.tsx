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
          {/* Mit Politikern Debattieren Card */}
          <motion.div variants={item} className="h-full">
            <Card className="h-full border-l-4 border-l-blue-600 hover:shadow-lg transition-all duration-300 overflow-hidden group">
              <div className="h-48 overflow-hidden relative">
                <img 
                  src="https://www.zdf.de/assets/tv-runde-bundestagswahlkampf-100~3840x2160?cb=1739751166268" 
                  alt="Debattieren" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                  <MessageSquareText className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle>Debattieren</CardTitle>
                <CardDescription>Tritt in den direkten Dialog mit KI-Repräsentanten bekannter Politiker.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/debate">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white group/btn">
                    Debatte beitreten <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Wahlkompass Card */}
          <motion.div variants={item} className="h-full">
            <Card className="h-full border-l-4 border-l-black hover:shadow-lg transition-all duration-300 overflow-hidden group">
              <div className="h-48 overflow-hidden relative">
                <img 
                  src="https://www.planet-wissen.de/sendungen/sendung-parteien-kugelschreiber-100~_v-HDready.png" 
                  alt="Wahlkompass" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                  <Vote className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle>Wahlkompass</CardTitle>
                <CardDescription>Finde heraus, welche Partei am besten zu deinen Werten passt.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/quizzes">
                  <Button className="w-full bg-black hover:bg-black/80 text-white group/btn">
                    Quiz starten <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Meinungscheck Card */}
          <motion.div variants={item} className="h-full">
            <Card className="h-full border-l-4 border-l-[#DD0000] hover:shadow-lg transition-all duration-300 overflow-hidden group">
              <div className="h-48 overflow-hidden relative">
                <img 
                  src="https://rp-online.de/imgs/32/1/1/3/3/0/9/6/1/5/tok_c1c2775d38855e2a4ecbb1b1fdb21440/w1200_h630_x3680_y2456_imago79731732h-49228d2156a8bd31.jpg" 
                  alt="Meinungscheck" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                  <Vote className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle>Meinungscheck</CardTitle>
                <CardDescription>Gib deine Stimme zu aktuellen Themen ab.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/polls">
                  <Button className="w-full bg-[#DD0000] hover:bg-[#DD0000]/90 text-white group/btn">
                    Jetzt abstimmen <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* CivicChat AI Card */}
          <motion.div variants={item} className="h-full">
            <Card className="h-full border-l-4 border-l-[#FFCC00] hover:shadow-lg transition-all duration-300 overflow-hidden group">
              <div className="h-48 overflow-hidden relative">
                <img 
                  src="https://copilot.microsoft.com/th/id/BCO.f7c1dd81-6633-4af1-9343-2277af0bde7c.png" 
                  alt="CivicChat AI" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                  <MessageSquareText className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle>CivicChat AI</CardTitle>
                <CardDescription>Diskutiere politische Themen mit unserem KI-Assistenten.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/chat">
                  <Button className="w-full bg-[#FFCC00] hover:bg-[#FFCC00]/90 text-black group/btn">
                    Chat starten <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Aktuelle Themen Card */}
          <motion.div variants={item} className="h-full lg:col-span-2">
            <Card className="h-full bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl overflow-hidden group">
              <div className="flex flex-col md:flex-row items-center h-full">
                <div className="flex-1 p-8">
                  <div className="flex items-center gap-2 text-white/60 mb-2">
                    <Newspaper className="w-5 h-5" />
                    <span className="text-sm font-medium uppercase tracking-wider">Aktuelle Themen</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-display font-bold mb-4">
                    Bleib informiert über die neuesten politischen Entwicklungen und Projekte.
                  </h3>
                  <Link href="/news">
                    <Button variant="secondary" size="lg" className="group/btn">
                      Artikel lesen <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
                <div className="hidden md:block w-1/3 h-full overflow-hidden relative">
                  <img 
                    src="https://images.unsplash.com/photo-1504711434969-e33886168f5c" 
                    alt="News" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent to-slate-900" />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Über uns Card */}
          <motion.div variants={item} className="h-full">
            <Card className="h-full border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Info className="w-6 h-6 text-purple-500" />
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
